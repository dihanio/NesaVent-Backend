import midtransClient from 'midtrans-client';
import config from '../config';
import Registration, { IRegistration } from '../models/Registration';
import Event from '../models/Event';
import { generateToken } from '../utils/crypto';
import logger from '../utils/logger';
import eventService from './event.service';

// Initialize Midtrans Snap client
const snap = new midtransClient.Snap({
  isProduction: config.midtrans.isProduction,
  serverKey: config.midtrans.serverKey,
  clientKey: config.midtrans.clientKey,
});

export interface CreatePaymentData {
  registrationId: string;
  amount: number;
  customerDetails: {
    firstName: string;
    lastName?: string;
    email: string;
    phone: string;
  };
  itemDetails: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
}

export interface PaymentNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  transaction_id: string;
  payment_type: string;
  fraud_status?: string;
}

class PaymentService {
  /**
   * Create Midtrans payment transaction
   */
  async createPayment(data: CreatePaymentData): Promise<{ snapToken: string; snapUrl: string; orderId: string }> {
    try {
      const registration = await Registration.findById(data.registrationId).populate('eventId');
      if (!registration) {
        throw new Error('Registrasi tidak ditemukan');
      }

      if (registration.payment.status !== 'pending') {
        throw new Error('Payment sudah diproses');
      }

      // Generate unique order ID
      const orderId = `NV-ORDER-${Date.now()}-${generateToken(8)}`;

      // Calculate admin fee (if any)
      const adminFee = 0; // Can be configured
      const totalAmount = data.amount + adminFee;

      // Prepare transaction parameters
      const parameter = {
        transaction_details: {
          order_id: orderId,
          gross_amount: totalAmount,
        },
        customer_details: {
          first_name: data.customerDetails.firstName,
          last_name: data.customerDetails.lastName || '',
          email: data.customerDetails.email,
          phone: data.customerDetails.phone,
        },
        item_details: data.itemDetails,
        callbacks: {
          finish: `${config.clientUrl}/payment/finish?order_id=${orderId}`,
          error: `${config.clientUrl}/payment/error?order_id=${orderId}`,
          pending: `${config.clientUrl}/payment/pending?order_id=${orderId}`,
        },
        expiry: {
          start_time: new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + ' +0700',
          unit: 'hours',
          duration: config.payment.expiryHours,
        },
        custom_field1: registration._id.toString(),
        custom_field2: registration.eventId._id.toString(),
        custom_field3: registration.userId.toString(),
      };

      // Create transaction
      const transaction = await snap.createTransaction(parameter);

      // Update registration with payment info
      registration.payment.orderId = orderId;
      registration.payment.snapToken = transaction.token;
      registration.payment.snapUrl = transaction.redirect_url;
      registration.payment.method = 'midtrans';
      registration.payment.totalAmount = totalAmount;
      registration.payment.adminFee = adminFee;
      await registration.save();

      logger.info(`Payment created: ${orderId} for registration ${registration._id}`);

      return {
        snapToken: transaction.token,
        snapUrl: transaction.redirect_url,
        orderId,
      };
    } catch (error: any) {
      logger.error('Create payment error:', error);
      throw new Error('Gagal membuat transaksi pembayaran');
    }
  }

  /**
   * Handle Midtrans payment notification (webhook)
   */
  async handlePaymentNotification(notification: PaymentNotification): Promise<void> {
    try {
      // Verify notification authenticity
      const isValid = await this.verifyNotification(notification);
      if (!isValid) {
        throw new Error('Signature notifikasi tidak valid');
      }

      const { order_id, transaction_status, transaction_id, fraud_status } = notification;

      // Find registration by order ID
      const registration = await Registration.findOne({ 'payment.orderId': order_id }).populate('eventId userId');
      if (!registration) {
        logger.error(`Registration not found for order ID: ${order_id}`);
        return;
      }

      logger.info(`Payment notification received: ${order_id} - Status: ${transaction_status}`);

      // Handle different transaction statuses
      switch (transaction_status) {
        case 'capture':
        case 'settlement':
          // Payment successful
          if (fraud_status === 'accept' || !fraud_status) {
            await this.handleSuccessfulPayment(registration, transaction_id);
          } else if (fraud_status === 'challenge') {
            logger.warn(`Payment challenged for order: ${order_id}`);
            registration.payment.status = 'pending';
            await registration.save();
          }
          break;

        case 'pending':
          // Payment pending
          registration.payment.status = 'pending';
          await registration.save();
          break;

        case 'deny':
        case 'cancel':
        case 'expire':
          // Payment failed/expired
          await this.handleFailedPayment(registration, transaction_status);
          break;

        case 'refund':
        case 'partial_refund':
          // Payment refunded
          await this.handleRefund(registration);
          break;

        default:
          logger.warn(`Unknown transaction status: ${transaction_status} for order: ${order_id}`);
      }
    } catch (error: any) {
      logger.error('Handle payment notification error:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  private async handleSuccessfulPayment(registration: IRegistration, transactionId: string): Promise<void> {
    try {
      // Update payment status
      registration.payment.status = 'paid';
      registration.payment.paidAt = new Date();
      registration.payment.transactionId = transactionId;
      registration.status = 'confirmed';

      await registration.save();

      // Update ticket availability
      const event = await Event.findById(registration.eventId);
      if (event) {
        const ticketType = event.ticketTypes.find((t) => t._id?.toString() === registration.ticketType.id.toString());
        if (ticketType) {
          await eventService.updateTicketAvailability(
            event._id.toString(),
            ticketType._id!.toString(),
            ticketType.sold + 1,
            Math.max(0, ticketType.reserved - 1)
          );
        }
      }

      logger.info(`Payment successful for registration: ${registration._id}`);

      // Generate and send ticket asynchronously
      this.generateAndSendTicket(registration).catch(error => {
        logger.error('Error generating ticket:', error);
      });
    } catch (error: any) {
      logger.error('Handle successful payment error:', error);
      throw error;
    }
  }

  /**
   * Generate ticket QR, PDF and send confirmation
   */
  private async generateAndSendTicket(registration: IRegistration): Promise<void> {
    try {
      const qrCodeService = await import('../utils/qrcode');
      const pdfService = await import('../utils/pdf');
      const { uploadDataURLToCloudinary, uploadToCloudinary } = await import('./cloudinary.service');
      const Event = (await import('../models/Event')).default;
      
      const event = await Event.findById(registration.eventId);
      if (!event) return;

      // Generate encrypted QR code
      const qrData = {
        registrationId: (registration._id as any).toString(),
        ticketNumber: registration.ticket.ticketNumber,
        eventId: (event._id as any).toString(),
        userId: registration.userId.toString(),
        timestamp: Date.now(),
      };
      const qrCodeDataURL = await qrCodeService.generateQRCodeDataURL(qrData);

      // Upload QR to Cloudinary
      const qrUpload = await uploadDataURLToCloudinary(qrCodeDataURL, {
        folder: 'tickets/qr',
        publicId: `qr_${registration.ticket.ticketNumber}`,
        resourceType: 'image',
      });

      // Generate PDF ticket
      const pdfBuffer = await pdfService.generateTicketPDF({
        ticketNumber: registration.ticket.ticketNumber,
        eventTitle: event.title,
        eventDate: event.schedule.start,
        eventTime: new Date(event.schedule.start).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        venueName: event.venue.name || event.venue.onlineLink || 'Online',
        venueAddress: event.venue.address,
        participantName: registration.participant.fullName,
        ticketType: registration.ticketType.name,
        qrCodeDataURL: qrCodeDataURL,
        organizationName: event.organizationName,
      });

      // Upload PDF to Cloudinary
      const pdfUpload = await uploadToCloudinary(pdfBuffer, {
        folder: 'tickets/pdf',
        publicId: `ticket_${registration.ticket.ticketNumber}`,
        resourceType: 'raw',
      });

      // Update registration with ticket URLs
      registration.ticket.qrCode = qrUpload;
      registration.ticket.pdfUrl = pdfUpload;
      await registration.save();

      // Send confirmation email
      const emailService = await import('./email.service');
      await emailService.sendConfirmationEmail(registration, event, pdfUpload);

      // Send WhatsApp notification
      const whatsappService = (await import('./whatsapp.service')).default;
      await whatsappService.sendRegistrationConfirmation(registration, event);

      // Send in-app notification
      const notificationService = (await import('./notification.service')).default;
      await notificationService.sendNotification({
        userId: registration.userId.toString(),
        type: 'payment_success',
        title: 'Pembayaran Berhasil',
        message: `Pembayaran untuk ${event.title} berhasil. Tiket Anda sudah tersedia!`,
        actionUrl: `/registrations/${(registration._id as any).toString()}`,
        channels: ['inApp', 'email'],
      });

      logger.info(`Ticket generated and sent for registration: ${registration._id}`);
    } catch (error) {
      logger.error('Generate and send ticket error:', error);
    }
  }

  /**
   * Handle failed payment
   */
  private async handleFailedPayment(registration: IRegistration, reason: string): Promise<void> {
    try {
      registration.payment.status = reason === 'expire' ? 'expired' : 'failed';
      registration.status = 'cancelled';

      await registration.save();

      // Release reserved ticket
      const event = await Event.findById(registration.eventId);
      if (event) {
        const ticketType = event.ticketTypes.find((t) => t._id?.toString() === registration.ticketType.id.toString());
        if (ticketType) {
          await eventService.updateTicketAvailability(
            event._id.toString(),
            ticketType._id!.toString(),
            ticketType.sold,
            Math.max(0, ticketType.reserved - 1)
          );
        }
      }

      logger.info(`Payment failed for registration: ${registration._id}. Reason: ${reason}`);
    } catch (error: any) {
      logger.error('Handle failed payment error:', error);
      throw error;
    }
  }

  /**
   * Handle refund
   */
  private async handleRefund(registration: IRegistration): Promise<void> {
    try {
      registration.payment.status = 'refunded';
      registration.payment.refundedAt = new Date();
      registration.status = 'cancelled';
      registration.ticket.status = 'cancelled';

      await registration.save();

      // Update ticket count
      const event = await Event.findById(registration.eventId);
      if (event) {
        const ticketType = event.ticketTypes.find((t) => t._id?.toString() === registration.ticketType.id.toString());
        if (ticketType) {
          await eventService.updateTicketAvailability(
            event._id.toString(),
            ticketType._id!.toString(),
            Math.max(0, ticketType.sold - 1),
            ticketType.reserved
          );
        }
      }

      logger.info(`Payment refunded for registration: ${registration._id}`);
    } catch (error: any) {
      logger.error('Handle refund error:', error);
      throw error;
    }
  }

  /**
   * Verify Midtrans notification signature
   */
  private async verifyNotification(notification: PaymentNotification): Promise<boolean> {
    try {
      const crypto = require('crypto');
      const { order_id, status_code, gross_amount, signature_key } = notification;

      // Create hash
      const hash = crypto
        .createHash('sha512')
        .update(`${order_id}${status_code}${gross_amount}${config.midtrans.serverKey}`)
        .digest('hex');

      return hash === signature_key;
    } catch (error: any) {
      logger.error('Verify notification error:', error);
      return false;
    }
  }

  /**
   * Check transaction status
   */
  async checkTransactionStatus(orderId: string): Promise<any> {
    try {
      // Use the Midtrans Core API for status check
      const status = await (snap as any).transaction.status(orderId);
      logger.info(`Transaction status checked: ${orderId} - ${status.transaction_status}`);
      return status;
    } catch (error: any) {
      logger.error('Check transaction status error:', error);
      throw new Error('Gagal mengecek status transaksi');
    }
  }

  /**
   * Cancel transaction
   */
  async cancelTransaction(orderId: string): Promise<void> {
    try {
      // Use the Midtrans Core API for cancellation
      await (snap as any).transaction.cancel(orderId);
      logger.info(`Transaction cancelled: ${orderId}`);

      // Update registration
      const registration = await Registration.findOne({ 'payment.orderId': orderId });
      if (registration) {
        await this.handleFailedPayment(registration, 'cancel');
      }
    } catch (error: any) {
      logger.error('Cancel transaction error:', error);
      throw new Error('Gagal membatalkan transaksi');
    }
  }

  /**
   * Request refund
   */
  async requestRefund(registrationId: string, reason: string): Promise<void> {
    try {
      const registration = await Registration.findById(registrationId);
      if (!registration) {
        throw new Error('Registrasi tidak ditemukan');
      }

      if (registration.payment.status !== 'paid') {
        throw new Error('Hanya pembayaran yang sudah berhasil yang dapat di-refund');
      }

      // Request refund via Midtrans API
      // Note: Midtrans refund needs to be done manually or via dashboard for most payment methods
      // This marks the registration as pending refund
      
      registration.payment.refundReason = reason;
      registration.cancellation = {
        cancelledAt: new Date(),
        reason,
        refundStatus: 'pending',
      };
      await registration.save();

      logger.info(`Refund requested for registration: ${registrationId}. Reason: ${reason}`);

      // Send refund request notification to admin asynchronously
      this.notifyAdminsForRefund(registration, reason).catch(error => {
        logger.error('Error notifying admins for refund:', error);
      });
    } catch (error: any) {
      logger.error('Request refund error:', error);
      throw error;
    }
  }

  /**
   * Notify admins about refund request
   */
  private async notifyAdminsForRefund(registration: IRegistration, reason: string): Promise<void> {
    try {
      const User = (await import('../models/User')).default;
      const notificationService = (await import('./notification.service')).default;
      const Event = (await import('../models/Event')).default;
      
      const [admins, event] = await Promise.all([
        User.find({ role: 'admin' }),
        Event.findById(registration.eventId),
      ]);

      if (!event) return;

      for (const admin of admins) {
        await notificationService.sendNotification({
          userId: admin._id.toString(),
          type: 'event_update',
          title: 'Permintaan Refund Baru',
          message: `${registration.participant.fullName} meminta refund untuk ${event.title} sebesar Rp ${registration.payment.totalAmount.toLocaleString('id-ID')}`,
          actionUrl: `/admin/refunds/${(registration._id as any).toString()}`,
          channels: ['inApp'],
        });
      }
    } catch (error) {
      logger.error('Notify admins for refund error:', error);
    }
  }

  /**
   * Process refund (Admin only)
   */
  async processRefund(registrationId: string, adminId: string): Promise<void> {
    try {
      const registration = await Registration.findById(registrationId);
      if (!registration) {
        throw new Error('Registrasi tidak ditemukan');
      }

      // Mark as refunded
      await this.handleRefund(registration);

      logger.info(`Refund processed by admin ${adminId} for registration: ${registrationId}`);

      // Send refund confirmation asynchronously
      this.sendRefundConfirmation(registration).catch(error => {
        logger.error('Error sending refund confirmation:', error);
      });
    } catch (error: any) {
      logger.error('Process refund error:', error);
      throw error;
    }
  }

  /**
   * Send refund confirmation to user
   */
  private async sendRefundConfirmation(registration: IRegistration): Promise<void> {
    try {
      const emailService = await import('./email.service');
      const whatsappService = (await import('./whatsapp.service')).default;
      const notificationService = (await import('./notification.service')).default;
      const Event = (await import('../models/Event')).default;
      
      const event = await Event.findById(registration.eventId);
      if (!event) return;

      // Send email
      await emailService.sendEmail({
        to: registration.participant.email,
        subject: `Refund Berhasil - ${event.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">✅ Refund Berhasil Diproses</h2>
            <p>Halo ${registration.participant.fullName},</p>
            <p>Refund Anda untuk event <strong>${event.title}</strong> telah berhasil diproses.</p>
            <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Nomor Registrasi:</strong> ${registration.registrationNumber}</p>
              <p style="margin: 8px 0 0 0;"><strong>Jumlah Refund:</strong> Rp ${registration.payment.totalAmount.toLocaleString('id-ID')}</p>
              ${registration.payment.refundReason ? `<p style="margin: 8px 0 0 0;"><strong>Alasan:</strong> ${registration.payment.refundReason}</p>` : ''}
            </div>
            <p>Dana akan masuk ke rekening Anda dalam 3-7 hari kerja.</p>
            <p style="color: #666; font-size: 14px; margin-top: 24px;">
              Terima kasih atas pengertiannya.
            </p>
          </div>
        `,
      });

      // Send WhatsApp
      await whatsappService.sendWhatsApp({
        target: registration.participant.phone,
        message: `✅ *REFUND BERHASIL*\n\nHalo ${registration.participant.fullName}!\n\nRefund untuk event *${event.title}* sebesar Rp ${registration.payment.totalAmount.toLocaleString('id-ID')} telah diproses.\n\nDana akan masuk dalam 3-7 hari kerja.\n\nTerima kasih! 🙏`,
      });

      // Send in-app notification
      await notificationService.sendNotification({
        userId: registration.userId.toString(),
        type: 'event_update',
        title: 'Refund Berhasil',
        message: `Refund sebesar Rp ${registration.payment.totalAmount.toLocaleString('id-ID')} telah diproses`,
        channels: ['inApp', 'email', 'whatsapp'],
      });
    } catch (error) {
      logger.error('Send refund confirmation error:', error);
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics(eventId: string): Promise<any> {
    try {
      const registrations = await Registration.find({ eventId });

      const stats = {
        totalTransactions: registrations.length,
        successfulPayments: registrations.filter((r) => r.payment.status === 'paid').length,
        pendingPayments: registrations.filter((r) => r.payment.status === 'pending').length,
        failedPayments: registrations.filter((r) => r.payment.status === 'failed').length,
        expiredPayments: registrations.filter((r) => r.payment.status === 'expired').length,
        refundedPayments: registrations.filter((r) => r.payment.status === 'refunded').length,
        totalRevenue: registrations
          .filter((r) => r.payment.status === 'paid')
          .reduce((sum, r) => sum + r.payment.totalAmount, 0),
        paymentMethods: this.groupByPaymentMethod(registrations.filter((r) => r.payment.status === 'paid')),
      };

      return stats;
    } catch (error: any) {
      logger.error('Get payment statistics error:', error);
      throw error;
    }
  }

  /**
   * Group registrations by payment method
   */
  private groupByPaymentMethod(registrations: IRegistration[]): Record<string, number> {
    return registrations.reduce((acc, reg) => {
      const method = reg.payment.provider || reg.payment.method || 'unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

export default new PaymentService();
