import mongoose from 'mongoose';
import Registration, { IRegistration, IParticipant } from '../models/Registration';
import Event from '../models/Event';
import User from '../models/User';
import { generateQRCodeDataURL } from '../utils/qrcode';
import { generateTicketPDF } from '../utils/pdf';
import { uploadQRCode, uploadTicketPDF } from '../services/cloudinary.service';
import { sendRegistrationConfirmationEmail } from '../services/email.service';
import paymentService from '../services/payment.service';
import eventService from '../services/event.service';
import config from '../config';
import logger from '../utils/logger';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export interface CreateRegistrationData {
  userId: string;
  eventId: string;
  ticketTypeId: string;
  quantity?: number;
  participant: IParticipant;
}

class RegistrationService {
  /**
   * Create new registration
   */
  async createRegistration(data: CreateRegistrationData): Promise<{ registration: IRegistration; payment: any }> {
    try {
      // Validate event exists and is open for registration
      const event = await Event.findById(data.eventId);
      if (!event) {
        throw new Error('Event tidak ditemukan');
      }

      if (event.status !== 'published') {
        throw new Error('Event belum dipublikasikan');
      }

      const now = new Date();
      if (now < event.schedule.registrationOpen) {
        throw new Error('Pendaftaran belum dibuka');
      }

      if (now > event.schedule.registrationClose) {
        throw new Error('Pendaftaran sudah ditutup');
      }

      // Validate ticket type
      const ticketType = event.ticketTypes.find((t) => t._id?.toString() === data.ticketTypeId);
      if (!ticketType) {
        throw new Error('Tipe tiket tidak ditemukan');
      }

      if (!ticketType.isActive) {
        throw new Error('Tipe tiket tidak aktif');
      }

      if (ticketType.available <= 0) {
        throw new Error('Tiket sudah habis');
      }

      // Check if user already registered
      const existingRegistration = await Registration.findOne({
        userId: data.userId,
        eventId: data.eventId,
        status: { $nin: ['cancelled'] },
      });

      if (existingRegistration) {
        throw new Error('Anda sudah terdaftar untuk event ini');
      }

      // Get user details
      const user = await User.findById(data.userId);
      if (!user) {
        throw new Error('User tidak ditemukan');
      }

      // Calculate payment
      const quantity = data.quantity || 1;
      const amount = ticketType.price * quantity;
      const adminFee = 0; // Can be configured
      const totalAmount = amount + adminFee;

      // Create registration
      const registration = await Registration.create({
        userId: data.userId,
        eventId: data.eventId,
        organizerId: event.organizerId,
        ticketType: {
          id: ticketType._id!,
          name: ticketType.name,
          price: ticketType.price,
        },
        quantity,
        participant: data.participant,
        payment: {
          method: amount === 0 ? 'free' : 'midtrans',
          provider: amount === 0 ? 'free' : undefined,
          status: amount === 0 ? 'paid' : 'pending',
          amount,
          adminFee,
          totalAmount,
          currency: 'IDR',
          orderId: '', // Will be set when creating payment
          paidAt: amount === 0 ? new Date() : undefined,
          expiredAt: new Date(Date.now() + config.payment.expiryHours * 60 * 60 * 1000),
        },
        ticket: {
          ticketNumber: '',
          qrCode: '',
          status: amount === 0 ? 'valid' : 'valid',
        },
        status: amount === 0 ? 'confirmed' : 'pending_payment',
        notifications: {
          reminderSent: false,
          confirmationSent: false,
          thankYouSent: false,
        },
        source: 'web',
      });

      // Reserve ticket
      await eventService.updateTicketAvailability(
        event._id.toString(),
        ticketType._id!.toString(),
        ticketType.sold,
        ticketType.reserved + quantity
      );

      // If free event, generate ticket immediately
      if (amount === 0) {
        await this.generateTicket(registration);
      }

      // Create payment if not free
      let paymentData = null;
      if (amount > 0) {
        const [firstName, ...lastNameParts] = data.participant.fullName.split(' ');
        const lastName = lastNameParts.join(' ');

        paymentData = await paymentService.createPayment({
          registrationId: registration._id.toString(),
          amount: totalAmount,
          customerDetails: {
            firstName,
            lastName,
            email: data.participant.email,
            phone: data.participant.phone,
          },
          itemDetails: [
            {
              id: event._id.toString(),
              name: `${event.title} - ${ticketType.name}`,
              price: totalAmount,
              quantity: 1,
            },
          ],
        });
      }

      logger.info(`Registration created: ${registration.registrationNumber} for event ${event.title}`);

      return {
        registration,
        payment: paymentData,
      };
    } catch (error: any) {
      logger.error('Create registration error:', error);
      throw error;
    }
  }

  /**
   * Generate ticket (QR code and PDF)
   */
  async generateTicket(registration: IRegistration): Promise<void> {
    try {
      const event = await Event.findById(registration.eventId);
      if (!event) {
        throw new Error('Event tidak ditemukan');
      }

      // Generate QR code data
      const qrData = {
        ticketNumber: registration.ticket.ticketNumber || `NV-TIX-${Date.now()}`,
        registrationId: registration._id.toString(),
        eventId: event._id.toString(),
        userId: registration.userId.toString(),
        timestamp: Date.now(),
      };

      // Generate QR code image
      const qrCodeDataURL = await generateQRCodeDataURL(qrData);

      // Upload QR code to Cloudinary
      const qrCodeUrl = await uploadQRCode(qrCodeDataURL, qrData.ticketNumber);

      // Generate PDF ticket
      const pdfBuffer = await generateTicketPDF({
        ticketNumber: qrData.ticketNumber,
        eventTitle: event.title,
        eventDate: event.schedule.start,
        eventTime: `${format(event.schedule.start, 'HH:mm', { locale: localeId })} - ${format(
          event.schedule.end,
          'HH:mm',
          { locale: localeId }
        )} WIB`,
        venueName: event.venue.name || event.venue.onlineLink || 'TBA',
        venueAddress: event.venue.address,
        participantName: registration.participant.fullName,
        ticketType: registration.ticketType.name,
        qrCodeDataURL,
        organizationName: event.organizationName,
      });

      // Upload PDF to Cloudinary
      const pdfUrl = await uploadTicketPDF(pdfBuffer, qrData.ticketNumber);

      // Update registration
      registration.ticket.ticketNumber = qrData.ticketNumber;
      registration.ticket.qrCode = JSON.stringify(qrData);
      registration.ticket.qrCodeUrl = qrCodeUrl;
      registration.ticket.pdfUrl = pdfUrl;

      await registration.save();

      // Send confirmation email
      try {
        await sendRegistrationConfirmationEmail(registration, event, pdfUrl);
        registration.notifications.confirmationSent = true;
        await registration.save();
      } catch (emailError) {
        logger.error('Failed to send confirmation email:', emailError);
      }

      logger.info(`Ticket generated for registration: ${registration._id}`);
    } catch (error: any) {
      logger.error('Generate ticket error:', error);
      throw error;
    }
  }

  /**
   * Get registration by ID
   */
  async getRegistrationById(registrationId: string, userId?: string): Promise<IRegistration | null> {
    try {
      const registration = await Registration.findById(registrationId).populate('eventId userId').lean();

      if (!registration) {
        return null;
      }

      // Check access
      if (userId && registration.userId.toString() !== userId) {
        throw new Error('Akses tidak diizinkan');
      }

      return registration as unknown as IRegistration;
    } catch (error: any) {
      logger.error('Get registration by ID error:', error);
      throw error;
    }
  }

  /**
   * Get user registrations
   */
  async getUserRegistrations(userId: string, status?: string): Promise<IRegistration[]> {
    try {
      const query: any = { userId };
      if (status) query.status = status;

      const registrations = await Registration.find(query)
        .populate('eventId')
        .sort({ createdAt: -1 })
        .lean();

      return registrations as unknown as IRegistration[];
    } catch (error: any) {
      logger.error('Get user registrations error:', error);
      throw error;
    }
  }

  /**
   * Get event registrations (for organizer)
   */
  async getEventRegistrations(eventId: string, organizerId?: string): Promise<IRegistration[]> {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event tidak ditemukan');
      }

      // Check if organizer owns the event
      if (organizerId && event.organizerId.toString() !== organizerId) {
        throw new Error('Akses tidak diizinkan');
      }

      const registrations = await Registration.find({ eventId })
        .populate('userId', 'profile.fullName email')
        .sort({ createdAt: -1 })
        .lean();

      return registrations as unknown as IRegistration[];
    } catch (error: any) {
      logger.error('Get event registrations error:', error);
      throw error;
    }
  }

  /**
   * Cancel registration
   */
  async cancelRegistration(registrationId: string, userId: string, reason: string): Promise<IRegistration> {
    try {
      const registration = await Registration.findById(registrationId);
      if (!registration) {
        throw new Error('Registrasi tidak ditemukan');
      }

      if (registration.userId.toString() !== userId) {
        throw new Error('Akses tidak diizinkan');
      }

      if (registration.status === 'cancelled') {
        throw new Error('Registrasi sudah dibatalkan');
      }

      if (registration.status === 'attended') {
        throw new Error('Registrasi yang sudah attended tidak dapat dibatalkan');
      }

      // Mark as cancelled
      registration.status = 'cancelled';
      registration.ticket.status = 'cancelled';
      registration.cancellation = {
        cancelledAt: new Date(),
        cancelledBy: registration.userId,
        reason,
        refundStatus: registration.payment.status === 'paid' ? 'pending' : 'not_applicable',
      };

      await registration.save();

      // Release ticket
      const event = await Event.findById(registration.eventId);
      if (event) {
        const ticketType = event.ticketTypes.find((t) => t._id?.toString() === registration.ticketType.id.toString());
        if (ticketType) {
          const newSold = registration.payment.status === 'paid' ? Math.max(0, ticketType.sold - 1) : ticketType.sold;
          const newReserved = registration.payment.status === 'pending' ? Math.max(0, ticketType.reserved - 1) : ticketType.reserved;

          await eventService.updateTicketAvailability(
            event._id.toString(),
            ticketType._id!.toString(),
            newSold,
            newReserved
          );
        }
      }

      // Request refund if paid
      if (registration.payment.status === 'paid') {
        await paymentService.requestRefund(registrationId, reason);
      }

      logger.info(`Registration cancelled: ${registrationId}. Reason: ${reason}`);

      return registration;
    } catch (error: any) {
      logger.error('Cancel registration error:', error);
      throw error;
    }
  }

  /**
   * Check in registration
   */
  async checkInRegistration(
    registrationId: string,
    checkedBy: string,
    location?: string,
    deviceInfo?: string
  ): Promise<IRegistration> {
    try {
      const registration = await Registration.findById(registrationId);
      if (!registration) {
        throw new Error('Registrasi tidak ditemukan');
      }

      if (registration.status !== 'confirmed') {
        throw new Error('Registrasi belum dikonfirmasi');
      }

      if (registration.ticket.status === 'used') {
        throw new Error('Tiket sudah digunakan');
      }

      if (registration.ticket.status === 'cancelled') {
        throw new Error('Tiket sudah dibatalkan');
      }

      // Mark as checked in
      registration.status = 'attended';
      registration.ticket.status = 'used';
      registration.ticket.checkIn = {
        checkedAt: new Date(),
        checkedBy: new mongoose.Types.ObjectId(checkedBy),
        location,
        deviceInfo,
      };

      await registration.save();

      logger.info(`Registration checked in: ${registrationId}`);

      return registration;
    } catch (error: any) {
      logger.error('Check in registration error:', error);
      throw error;
    }
  }

  /**
   * Validate QR code for check-in
   */
  async validateQRCode(qrData: any): Promise<{ valid: boolean; registration?: IRegistration; message: string }> {
    try {
      const { registrationId, ticketNumber, timestamp } = qrData;

      // Check if QR code is not too old (24 hours in production, can be adjusted)
      const qrAge = Date.now() - timestamp;
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      if (qrAge > maxAge) {
        return { valid: false, message: 'QR code sudah kedaluwarsa' };
      }

      // Find registration
      const registration = await Registration.findById(registrationId).populate('eventId');
      if (!registration) {
        return { valid: false, message: 'Registrasi tidak ditemukan' };
      }

      // Validate ticket number
      if (registration.ticket.ticketNumber !== ticketNumber) {
        return { valid: false, message: 'Nomor tiket tidak valid' };
      }

      // Check ticket status
      if (registration.ticket.status === 'used') {
        return {
          valid: false,
          registration,
          message: `Tiket sudah digunakan pada ${format(registration.ticket.checkIn?.checkedAt || new Date(), 'dd MMM yyyy HH:mm', { locale: localeId })}`,
        };
      }

      if (registration.ticket.status === 'cancelled') {
        return { valid: false, registration, message: 'Tiket sudah dibatalkan' };
      }

      if (registration.status !== 'confirmed') {
        return { valid: false, registration, message: 'Registrasi belum dikonfirmasi' };
      }

      return { valid: true, registration, message: 'QR code valid' };
    } catch (error: any) {
      logger.error('Validate QR code error:', error);
      return { valid: false, message: 'Gagal memvalidasi QR code' };
    }
  }

  /**
   * Get registration statistics
   */
  async getRegistrationStatistics(eventId: string): Promise<any> {
    try {
      const registrations = await Registration.find({ eventId });

      const stats = {
        total: registrations.length,
        confirmed: registrations.filter((r) => r.status === 'confirmed').length,
        pendingPayment: registrations.filter((r) => r.status === 'pending_payment').length,
        cancelled: registrations.filter((r) => r.status === 'cancelled').length,
        attended: registrations.filter((r) => r.status === 'attended').length,
        noShow: registrations.filter((r) => r.status === 'no_show').length,
        attendanceRate: 0,
      };

      if (stats.confirmed > 0) {
        stats.attendanceRate = Math.round((stats.attended / stats.confirmed) * 100);
      }

      return stats;
    } catch (error: any) {
      logger.error('Get registration statistics error:', error);
      throw error;
    }
  }

  /**
   * Export registrations to CSV
   */
  async exportRegistrationsToCsv(eventId: string, organizerId?: string): Promise<string> {
    try {
      const registrations = await this.getEventRegistrations(eventId, organizerId);

      // Create CSV content
      const headers = [
        'No',
        'Nomor Registrasi',
        'Nomor Tiket',
        'Nama',
        'Email',
        'Telepon',
        'NIM',
        'Prodi',
        'Angkatan',
        'Jenis Tiket',
        'Harga',
        'Status Pembayaran',
        'Status Registrasi',
        'Status Tiket',
        'Waktu Daftar',
        'Check-in',
      ];

      const rows = registrations.map((reg, index) => [
        index + 1,
        reg.registrationNumber,
        reg.ticket.ticketNumber || '-',
        reg.participant.fullName,
        reg.participant.email,
        reg.participant.phone,
        reg.participant.nim || '-',
        reg.participant.prodi || '-',
        reg.participant.angkatan || '-',
        reg.ticketType.name,
        reg.ticketType.price,
        reg.payment.status,
        reg.status,
        reg.ticket.status,
        format(reg.createdAt, 'dd/MM/yyyy HH:mm'),
        reg.ticket.checkIn?.checkedAt ? format(reg.ticket.checkIn.checkedAt, 'dd/MM/yyyy HH:mm') : '-',
      ]);

      const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

      return csv;
    } catch (error: any) {
      logger.error('Export registrations to CSV error:', error);
      throw error;
    }
  }
}

export default new RegistrationService();
