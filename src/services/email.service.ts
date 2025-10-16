import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import config from '../config';
import logger from '../utils/logger';
import { IUser } from '../models/User';
import { IEvent } from '../models/Event';
import { IRegistration } from '../models/Registration';

// Initialize email provider based on configuration
const useResend = !!config.email.apiKey;
const resend = useResend ? new Resend(config.email.apiKey) : null;

// Initialize nodemailer for SMTP (Mailpit in development)
const transporter = !useResend ? nodemailer.createTransport({
  host: config.email.smtp.host,
  port: config.email.smtp.port,
  secure: config.email.smtp.secure,
  auth: config.email.smtp.auth,
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates in development
  },
}) : null;

if (!useResend) {
  logger.info(`📧 Email service initialized with SMTP (${config.email.smtp.host}:${config.email.smtp.port})`);
} else {
  logger.info('📧 Email service initialized with Resend');
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using Resend or SMTP
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    if (useResend && resend) {
      // Use Resend
      await resend.emails.send({
        from: config.email.from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    } else if (transporter) {
      // Use SMTP (nodemailer)
      await transporter.sendMail({
        from: config.email.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    } else {
      throw new Error('Email service tidak dikonfigurasi');
    }
    logger.info(`Email sent to: ${options.to}`);
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send verification email
 */
export const sendVerificationEmail = async (user: IUser, token: string): Promise<void> => {
  const verificationUrl = `${config.clientUrl}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verifikasi Email Anda</h1>
        </div>
        <div class="content">
          <p>Halo <strong>${user.profile.fullName}</strong>,</p>
          <p>Terima kasih telah mendaftar di Nesavent! Untuk melengkapi pendaftaran Anda, silakan verifikasi email Anda dengan mengklik tombol di bawah ini:</p>
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verifikasi Email</a>
          </div>
          <p>Atau salin dan tempel URL berikut di browser Anda:</p>
          <p style="word-break: break-all; color: #3b82f6;">${verificationUrl}</p>
          <p>Link verifikasi ini akan kedaluwarsa dalam 24 jam.</p>
          <p>Jika Anda tidak mendaftar di Nesavent, abaikan email ini.</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 Nesavent. All rights reserved.</p>
          <p>Kelola Event Kampusmu dengan Mudah</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Verifikasi Email Anda - Nesavent',
    html,
    text: `Halo ${user.profile.fullName}, silakan verifikasi email Anda dengan mengunjungi: ${verificationUrl}`,
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (user: IUser, token: string): Promise<void> => {
  const resetUrl = `${config.clientUrl}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Password</h1>
        </div>
        <div class="content">
          <p>Halo <strong>${user.profile.fullName}</strong>,</p>
          <p>Kami menerima permintaan untuk mereset password akun Anda. Klik tombol di bawah ini untuk membuat password baru:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          <p>Atau salin dan tempel URL berikut di browser Anda:</p>
          <p style="word-break: break-all; color: #3b82f6;">${resetUrl}</p>
          <p>Link ini akan kedaluwarsa dalam 1 jam.</p>
          <p>Jika Anda tidak meminta reset password, abaikan email ini dan password Anda tidak akan berubah.</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 Nesavent. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Reset Password - Nesavent',
    html,
    text: `Reset password Anda dengan mengunjungi: ${resetUrl}`,
  });
};

/**
 * Send registration confirmation email
 */
export const sendRegistrationConfirmationEmail = async (
  registration: IRegistration,
  event: IEvent,
  pdfUrl: string
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; }
        .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Registrasi Berhasil!</h1>
        </div>
        <div class="content">
          <p>Halo <strong>${registration.participant.fullName}</strong>,</p>
          <p>Selamat! Registrasi Anda untuk event berikut telah dikonfirmasi:</p>
          <div class="event-details">
            <h2 style="margin-top: 0; color: #111827;">${event.title}</h2>
            <p><strong>Nomor Registrasi:</strong> ${registration.registrationNumber}</p>
            <p><strong>Nomor Tiket:</strong> ${registration.ticket.ticketNumber}</p>
            <p><strong>Jenis Tiket:</strong> ${registration.ticketType.name}</p>
            <p><strong>Tanggal:</strong> ${new Date(event.schedule.start).toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}</p>
            <p><strong>Waktu:</strong> ${new Date(event.schedule.start).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })}</p>
            <p><strong>Lokasi:</strong> ${event.venue.name || event.venue.onlineLink || 'TBA'}</p>
          </div>
          <p>E-tiket Anda sudah siap! Download e-tiket dengan mengklik tombol di bawah:</p>
          <div style="text-align: center;">
            <a href="${pdfUrl}" class="button">Download E-Ticket</a>
          </div>
          <p><strong>Penting:</strong></p>
          <ul>
            <li>Simpan e-tiket ini dengan baik</li>
            <li>Tunjukkan QR code pada e-tiket saat check-in</li>
            <li>Datang 15 menit sebelum event dimulai</li>
          </ul>
          <p>Kami menantikan kehadiran Anda!</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 Nesavent. All rights reserved.</p>
          <p>Ada pertanyaan? Hubungi panitia: ${event.contactPerson.email}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: registration.participant.email,
    subject: `Konfirmasi Registrasi - ${event.title}`,
    html,
    text: `Registrasi Anda untuk ${event.title} telah dikonfirmasi. Nomor tiket: ${registration.ticket.ticketNumber}. Download e-tiket di: ${pdfUrl}`,
  });
};

/**
 * Send event reminder email
 */
export const sendEventReminderEmail = async (
  registration: IRegistration,
  event: IEvent
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Pengingat Event</h1>
        </div>
        <div class="content">
          <p>Halo <strong>${registration.participant.fullName}</strong>,</p>
          <p>Ini adalah pengingat bahwa event <strong>${event.title}</strong> akan segera dimulai!</p>
          <p><strong>Tanggal:</strong> ${new Date(event.schedule.start).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}</p>
          <p><strong>Waktu:</strong> ${new Date(event.schedule.start).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })}</p>
          <p><strong>Lokasi:</strong> ${event.venue.name || event.venue.onlineLink || 'TBA'}</p>
          <p>Jangan lupa membawa e-tiket Anda!</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 Nesavent. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: registration.participant.email,
    subject: `Pengingat: ${event.title} - Besok!`,
    html,
  });
};

// Alias for confirmation email
export const sendConfirmationEmail = sendRegistrationConfirmationEmail;

// Default export
const emailService = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendRegistrationConfirmationEmail,
  sendConfirmationEmail,
  sendEventReminderEmail,
};

export default emailService;
