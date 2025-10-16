import Registration, { IRegistration } from '../models/Registration';
import Event from '../models/Event';
import User from '../models/User';
import registrationService from '../services/registration.service';
import whatsappService from '../services/whatsapp.service';
import logger from '../utils/logger';
import { decryptQRCode } from '../utils/crypto';

export interface CheckInData {
  qrCodeData: string;
  checkedBy: string;
  location?: string;
  deviceInfo?: string;
}

export interface CheckInStats {
  totalRegistrations: number;
  checkedIn: number;
  notCheckedIn: number;
  checkInRate: number;
  checkInHistory: Array<{
    time: string;
    count: number;
  }>;
}

class CheckInService {
  /**
   * Process check-in via QR code
   */
  async processCheckIn(data: CheckInData): Promise<{ success: boolean; registration?: IRegistration; message: string }> {
    try {
      // Decrypt QR code data
      let qrData: any;
      try {
        qrData = decryptQRCode(data.qrCodeData);
      } catch (error) {
        // If decryption fails, try parsing as plain JSON (for backward compatibility)
        try {
          qrData = JSON.parse(data.qrCodeData);
        } catch (parseError) {
          return { success: false, message: 'QR code tidak valid' };
        }
      }

      // Validate QR code
      const validation = await registrationService.validateQRCode(qrData);
      if (!validation.valid) {
        return { success: false, registration: validation.registration, message: validation.message };
      }

      // Check in the registration
      const registration = await registrationService.checkInRegistration(
        qrData.registrationId,
        data.checkedBy,
        data.location,
        data.deviceInfo
      );

      // Send WhatsApp confirmation
      const event = await Event.findById(registration.eventId);
      if (event) {
        try {
          await whatsappService.sendCheckInConfirmation(registration, event);
        } catch (error) {
          logger.error('Failed to send WhatsApp check-in confirmation:', error);
        }
      }

      return {
        success: true,
        registration,
        message: 'Check-in berhasil',
      };
    } catch (error: any) {
      logger.error('Process check-in error:', error);
      return {
        success: false,
        message: error.message || 'Gagal melakukan check-in',
      };
    }
  }

  /**
   * Bulk check-in (for manual check-in by organizer)
   */
  async bulkCheckIn(
    registrationIds: string[],
    checkedBy: string,
    location?: string,
    deviceInfo?: string
  ): Promise<{ success: number; failed: number; results: Array<{ registrationId: string; success: boolean; message: string }> }> {
    try {
      const results: Array<{ registrationId: string; success: boolean; message: string }> = [];
      let successCount = 0;
      let failedCount = 0;

      for (const registrationId of registrationIds) {
        try {
          await registrationService.checkInRegistration(registrationId, checkedBy, location, deviceInfo);
          results.push({ registrationId, success: true, message: 'Check-in berhasil' });
          successCount++;
        } catch (error: any) {
          results.push({ registrationId, success: false, message: error.message });
          failedCount++;
        }
      }

      logger.info(`Bulk check-in completed: ${successCount} success, ${failedCount} failed`);

      return { success: successCount, failed: failedCount, results };
    } catch (error: any) {
      logger.error('Bulk check-in error:', error);
      throw error;
    }
  }

  /**
   * Get check-in statistics
   */
  async getCheckInStats(eventId: string): Promise<CheckInStats> {
    try {
      const registrations = await Registration.find({ eventId, status: { $ne: 'cancelled' } });

      const checkedInRegistrations = registrations.filter(
        (r) => r.status === 'attended' && r.ticket.checkIn?.checkedAt
      );

      // Group check-ins by hour
      const checkInHistory: { [key: string]: number } = {};
      checkedInRegistrations.forEach((r) => {
        if (r.ticket.checkIn?.checkedAt) {
          const hour = new Date(r.ticket.checkIn.checkedAt).toISOString().slice(0, 13);
          checkInHistory[hour] = (checkInHistory[hour] || 0) + 1;
        }
      });

      const historyArray = Object.entries(checkInHistory)
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => a.time.localeCompare(b.time));

      const totalRegistrations = registrations.length;
      const checkedIn = checkedInRegistrations.length;
      const notCheckedIn = totalRegistrations - checkedIn;
      const checkInRate = totalRegistrations > 0 ? Math.round((checkedIn / totalRegistrations) * 100) : 0;

      return {
        totalRegistrations,
        checkedIn,
        notCheckedIn,
        checkInRate,
        checkInHistory: historyArray,
      };
    } catch (error: any) {
      logger.error('Get check-in stats error:', error);
      throw error;
    }
  }

  /**
   * Get check-in list
   */
  async getCheckInList(eventId: string, status?: 'checked-in' | 'not-checked-in'): Promise<IRegistration[]> {
    try {
      const query: any = { eventId, status: { $ne: 'cancelled' } };

      if (status === 'checked-in') {
        query.status = 'attended';
      } else if (status === 'not-checked-in') {
        query.status = { $in: ['confirmed', 'pending_payment'] };
      }

      const registrations = await Registration.find(query)
        .populate('userId', 'profile.fullName email')
        .sort({ 'ticket.checkIn.checkedAt': -1, createdAt: -1 })
        .lean();

      return registrations as unknown as IRegistration[];
    } catch (error: any) {
      logger.error('Get check-in list error:', error);
      throw error;
    }
  }

  /**
   * Validate registration for check-in (without actually checking in)
   */
  async validateRegistration(registrationId: string): Promise<{ valid: boolean; registration?: IRegistration; message: string }> {
    try {
      const registration = await Registration.findById(registrationId).populate('eventId');

      if (!registration) {
        return { valid: false, message: 'Registrasi tidak ditemukan' };
      }

      if (registration.status === 'cancelled') {
        return { valid: false, registration, message: 'Registrasi telah dibatalkan' };
      }

      if (registration.status === 'pending_payment') {
        return { valid: false, registration, message: 'Pembayaran belum selesai' };
      }

      if (registration.status === 'attended') {
        return { valid: false, registration, message: 'Sudah check-in sebelumnya' };
      }

      if (registration.ticket.status === 'cancelled') {
        return { valid: false, registration, message: 'Tiket sudah dibatalkan' };
      }

      if (registration.ticket.status === 'used') {
        return { valid: false, registration, message: 'Tiket sudah digunakan' };
      }

      return { valid: true, registration, message: 'Registrasi valid' };
    } catch (error: any) {
      logger.error('Validate registration error:', error);
      return { valid: false, message: 'Gagal memvalidasi registrasi' };
    }
  }

  /**
   * Undo check-in (for mistakes)
   */
  async undoCheckIn(registrationId: string, undoneBy: string, reason: string): Promise<IRegistration> {
    try {
      const registration = await Registration.findById(registrationId);

      if (!registration) {
        throw new Error('Registrasi tidak ditemukan');
      }

      if (registration.status !== 'attended') {
        throw new Error('Registrasi belum check-in');
      }

      // Revert to confirmed status
      registration.status = 'confirmed';
      registration.ticket.status = 'valid';
      
      // Store undo information in metadata
      if (!registration.metadata) {
        registration.metadata = {};
      }
      registration.metadata.checkInUndone = {
        undoneAt: new Date(),
        undoneBy,
        reason,
        originalCheckIn: registration.ticket.checkIn,
      };

      // Clear check-in data
      registration.ticket.checkIn = undefined;

      await registration.save();

      logger.info(`Check-in undone for registration: ${registrationId}. Reason: ${reason}`);

      return registration;
    } catch (error: any) {
      logger.error('Undo check-in error:', error);
      throw error;
    }
  }

  /**
   * Export check-in data
   */
  async exportCheckInData(eventId: string): Promise<string> {
    try {
      const registrations = await this.getCheckInList(eventId);

      // Create CSV content
      const headers = [
        'No',
        'Nomor Registrasi',
        'Nomor Tiket',
        'Nama',
        'Email',
        'Telepon',
        'Status',
        'Waktu Check-in',
        'Lokasi Check-in',
        'Check-in Oleh',
      ];

      const rows = registrations.map((reg, index) => [
        index + 1,
        reg.registrationNumber,
        reg.ticket.ticketNumber || '-',
        reg.participant.fullName,
        reg.participant.email,
        reg.participant.phone,
        reg.status === 'attended' ? 'Hadir' : 'Belum Hadir',
        reg.ticket.checkIn?.checkedAt
          ? new Date(reg.ticket.checkIn.checkedAt).toLocaleString('id-ID')
          : '-',
        reg.ticket.checkIn?.location || '-',
        reg.ticket.checkIn?.checkedBy || '-',
      ]);

      const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

      return csv;
    } catch (error: any) {
      logger.error('Export check-in data error:', error);
      throw error;
    }
  }
}

export default new CheckInService();
