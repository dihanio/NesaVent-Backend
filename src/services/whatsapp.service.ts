import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';
import { IEvent } from '../models/Event';
import { IRegistration } from '../models/Registration';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface SendWhatsAppParams {
  target: string;
  message: string;
}

interface SendBulkWhatsAppParams {
  targets: string[];
  message: string;
}

class WhatsAppService {
  private apiUrl = 'https://api.fonnte.com/send';
  private token = config.fonnte.token;

  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(params: SendWhatsAppParams): Promise<boolean> {
    try {
      if (!this.token) {
        logger.warn('Fonnte token not configured, skipping WhatsApp notification');
        return false;
      }

      // Normalize phone number (remove +, spaces, dashes)
      const normalizedPhone = params.target.replace(/[\s\-\+]/g, '');

      const response = await axios.post(
        this.apiUrl,
        {
          target: normalizedPhone,
          message: params.message,
          countryCode: '62', // Indonesia
        },
        {
          headers: {
            Authorization: this.token,
          },
        }
      );

      if (response.data.status) {
        logger.info(`WhatsApp sent to ${normalizedPhone}`);
        return true;
      } else {
        logger.error(`Failed to send WhatsApp: ${response.data.reason}`);
        return false;
      }
    } catch (error: any) {
      logger.error('Send WhatsApp error:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Send bulk WhatsApp messages
   */
  async sendBulkWhatsApp(params: SendBulkWhatsAppParams): Promise<number> {
    try {
      if (!this.token) {
        logger.warn('Fonnte token not configured, skipping WhatsApp notifications');
        return 0;
      }

      let successCount = 0;

      // Send messages with delay to avoid rate limiting
      for (const target of params.targets) {
        const sent = await this.sendWhatsApp({
          target,
          message: params.message,
        });

        if (sent) successCount++;

        // Delay between messages (1 second)
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      logger.info(`Bulk WhatsApp sent: ${successCount}/${params.targets.length} successful`);
      return successCount;
    } catch (error: any) {
      logger.error('Send bulk WhatsApp error:', error);
      return 0;
    }
  }

  /**
   * Send registration confirmation WhatsApp
   */
  async sendRegistrationConfirmation(registration: IRegistration, event: IEvent): Promise<boolean> {
    try {
      const eventDate = format(event.schedule.start, 'EEEE, dd MMMM yyyy', { locale: localeId });
      const eventTime = format(event.schedule.start, 'HH:mm', { locale: localeId });

      const message = `*KONFIRMASI REGISTRASI NESAVENT*\n\n` +
        `Halo ${registration.participant.fullName}! 👋\n\n` +
        `Registrasi Anda berhasil untuk:\n` +
        `📌 *${event.title}*\n` +
        `📅 ${eventDate}\n` +
        `⏰ ${eventTime} WIB\n` +
        `📍 ${event.venue.name || event.venue.onlineLink || 'TBA'}\n\n` +
        `🎫 *Nomor Registrasi:* ${registration.registrationNumber}\n` +
        `💰 *Jenis Tiket:* ${registration.ticketType.name}\n\n` +
        `${registration.payment.status === 'pending' 
          ? `⚠️ Menunggu pembayaran. Silakan selesaikan pembayaran Anda.\n\n` 
          : `✅ Pembayaran berhasil! E-tiket telah dikirim ke email Anda.\n\n`}` +
        `Terima kasih telah mendaftar! 🎉`;

      return await this.sendWhatsApp({
        target: registration.participant.phone,
        message,
      });
    } catch (error: any) {
      logger.error('Send registration confirmation WhatsApp error:', error);
      return false;
    }
  }

  /**
   * Send payment reminder WhatsApp
   */
  async sendPaymentReminder(registration: IRegistration, event: IEvent): Promise<boolean> {
    try {
      const expiryDate = format(registration.payment.expiredAt!, 'dd MMMM yyyy HH:mm', { locale: localeId });

      const message = `*PENGINGAT PEMBAYARAN NESAVENT*\n\n` +
        `Halo ${registration.participant.fullName}! 👋\n\n` +
        `Kami mengingatkan Anda untuk menyelesaikan pembayaran registrasi:\n\n` +
        `📌 *${event.title}*\n` +
        `🎫 *Nomor Registrasi:* ${registration.registrationNumber}\n` +
        `💰 *Total Pembayaran:* Rp ${registration.payment.totalAmount.toLocaleString('id-ID')}\n\n` +
        `⏰ *Batas Pembayaran:* ${expiryDate} WIB\n\n` +
        `Segera selesaikan pembayaran Anda agar tiket tidak hangus! ⚠️`;

      return await this.sendWhatsApp({
        target: registration.participant.phone,
        message,
      });
    } catch (error: any) {
      logger.error('Send payment reminder WhatsApp error:', error);
      return false;
    }
  }

  /**
   * Send event reminder WhatsApp
   */
  async sendEventReminder(registration: IRegistration, event: IEvent): Promise<boolean> {
    try {
      const eventDate = format(event.schedule.start, 'EEEE, dd MMMM yyyy', { locale: localeId });
      const eventTime = format(event.schedule.start, 'HH:mm', { locale: localeId });

      const message = `*PENGINGAT EVENT NESAVENT*\n\n` +
        `Halo ${registration.participant.fullName}! 👋\n\n` +
        `Event yang Anda daftarkan akan segera dimulai:\n\n` +
        `📌 *${event.title}*\n` +
        `📅 ${eventDate}\n` +
        `⏰ ${eventTime} WIB\n` +
        `📍 ${event.venue.name || event.venue.onlineLink || 'TBA'}\n\n` +
        `🎫 *Nomor Tiket:* ${registration.ticket.ticketNumber}\n\n` +
        `Jangan lupa untuk:\n` +
        `✓ Datang tepat waktu\n` +
        `✓ Bawa QR code tiket Anda\n` +
        `✓ Patuhi protokol kesehatan\n\n` +
        `Sampai jumpa di event! 🎉`;

      return await this.sendWhatsApp({
        target: registration.participant.phone,
        message,
      });
    } catch (error: any) {
      logger.error('Send event reminder WhatsApp error:', error);
      return false;
    }
  }

  /**
   * Send check-in confirmation WhatsApp
   */
  async sendCheckInConfirmation(registration: IRegistration, event: IEvent): Promise<boolean> {
    try {
      const message = `*CHECK-IN BERHASIL*\n\n` +
        `Halo ${registration.participant.fullName}! 👋\n\n` +
        `Anda telah berhasil check-in untuk:\n\n` +
        `📌 *${event.title}*\n` +
        `🎫 *Nomor Tiket:* ${registration.ticket.ticketNumber}\n` +
        `⏰ *Waktu Check-in:* ${format(registration.ticket.checkIn?.checkedAt || new Date(), 'dd/MM/yyyy HH:mm', { locale: localeId })} WIB\n\n` +
        `Selamat menikmati event! 🎉`;

      return await this.sendWhatsApp({
        target: registration.participant.phone,
        message,
      });
    } catch (error: any) {
      logger.error('Send check-in confirmation WhatsApp error:', error);
      return false;
    }
  }

  /**
   * Send event update to all participants
   */
  async sendEventUpdate(event: IEvent, participants: IRegistration[], updateMessage: string): Promise<number> {
    try {
      const message = `*UPDATE EVENT NESAVENT*\n\n` +
        `📌 *${event.title}*\n\n` +
        `${updateMessage}\n\n` +
        `Terima kasih atas perhatiannya! 🙏`;

      const phones = participants.map((p) => p.participant.phone);

      return await this.sendBulkWhatsApp({
        targets: phones,
        message,
      });
    } catch (error: any) {
      logger.error('Send event update WhatsApp error:', error);
      return 0;
    }
  }

  /**
   * Send event cancelled notification
   */
  async sendEventCancelled(registration: IRegistration, event: IEvent, reason: string): Promise<boolean> {
    try {
      const message = `*EVENT DIBATALKAN*\n\n` +
        `Halo ${registration.participant.fullName},\n\n` +
        `Kami informasikan bahwa event berikut telah dibatalkan:\n\n` +
        `📌 *${event.title}*\n` +
        `📅 ${format(event.schedule.start, 'dd MMMM yyyy', { locale: localeId })}\n\n` +
        `*Alasan:* ${reason}\n\n` +
        `${registration.payment.status === 'paid' 
          ? `💰 Dana Anda akan dikembalikan dalam 3-7 hari kerja.\n\n` 
          : ``}` +
        `Mohon maaf atas ketidaknyamanannya. 🙏`;

      return await this.sendWhatsApp({
        target: registration.participant.phone,
        message,
      });
    } catch (error: any) {
      logger.error('Send event cancelled WhatsApp error:', error);
      return false;
    }
  }
}

export default new WhatsAppService();
