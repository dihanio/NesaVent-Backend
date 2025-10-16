import cron from 'node-cron';
import Registration from '../models/Registration';
import Event from '../models/Event';
import notificationService from '../services/notification.service';
import emailService from '../services/email.service';
import whatsappService from '../services/whatsapp.service';
import logger from '../utils/logger';
import { subHours, subDays, isAfter, isBefore } from 'date-fns';

/**
 * Send payment reminders for pending payments
 * Runs every 6 hours
 */
export const sendPaymentRemindersJob = cron.schedule('0 */6 * * *', async () => {
  try {
    logger.info('🔄 Running payment reminder job...');

    const now = new Date();
    const sixHoursFromNow = subHours(now, 6);

    // Find pending payments expiring in the next 6 hours
    const pendingRegistrations = await Registration.find({
      'payment.status': 'pending',
      'payment.expiredAt': { $gt: now, $lte: subHours(now, -6) },
      'notifications.reminderSent': false,
    }).populate('eventId');

    logger.info(`Found ${pendingRegistrations.length} pending payments needing reminders`);

    let sentCount = 0;

    for (const registration of pendingRegistrations) {
      try {
        const event = registration.eventId as any;

        if (!event) continue;

        // Send email reminder
        try {
          await emailService.sendEmail({
            to: registration.participant.email,
            subject: `⏰ Pengingat Pembayaran - ${event.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ef4444;">⏰ Segera Selesaikan Pembayaran!</h2>
                <p>Halo ${registration.participant.fullName},</p>
                <p>Pembayaran Anda untuk event <strong>${event.title}</strong> akan segera kedaluwarsa.</p>
                <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p style="margin: 0;"><strong>Nomor Registrasi:</strong> ${registration.registrationNumber}</p>
                  <p style="margin: 8px 0 0 0;"><strong>Total Pembayaran:</strong> Rp ${registration.payment.totalAmount.toLocaleString('id-ID')}</p>
                  <p style="margin: 8px 0 0 0; color: #ef4444;"><strong>Batas Waktu:</strong> ${registration.payment.expiredAt?.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</p>
                </div>
                <p>Segera selesaikan pembayaran Anda agar tiket tidak hangus!</p>
                <a href="${registration.payment.snapUrl}" 
                   style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; margin: 16px 0;">
                  Bayar Sekarang
                </a>
                <p style="color: #666; font-size: 14px; margin-top: 24px;">
                  Jika Anda memiliki pertanyaan, hubungi kami di support@nesavent.com
                </p>
              </div>
            `,
          });
        } catch (emailError) {
          logger.error('Failed to send payment reminder email:', emailError);
        }

        // Send WhatsApp reminder
        try {
          await whatsappService.sendPaymentReminder(registration, event);
        } catch (whatsappError) {
          logger.error('Failed to send payment reminder WhatsApp:', whatsappError);
        }

        // Mark reminder as sent
        registration.notifications.reminderSent = true;
        await registration.save();

        sentCount++;
      } catch (error) {
        logger.error(`Failed to send reminder for registration ${registration._id}:`, error);
      }
    }

    logger.info(`✅ Payment reminder job completed: ${sentCount} reminders sent`);
  } catch (error) {
    logger.error('❌ Payment reminder job error:', error);
  }
});

/**
 * Send event reminders 24 hours before event
 * Runs every hour
 */
export const sendEventRemindersJob = cron.schedule('0 * * * *', async () => {
  try {
    logger.info('🔄 Running event reminder job...');

    const now = new Date();
    const twentyFourHoursFromNow = subHours(now, -24);
    const twentyFiveHoursFromNow = subHours(now, -25);

    // Find events starting in 24 hours
    const upcomingEvents = await Event.find({
      'schedule.start': {
        $gte: twentyFiveHoursFromNow,
        $lte: twentyFourHoursFromNow,
      },
      status: 'published',
    });

    logger.info(`Found ${upcomingEvents.length} events starting in 24 hours`);

    let totalReminders = 0;

    for (const event of upcomingEvents) {
      try {
        // Get all confirmed registrations for this event
        const confirmedRegistrations = await Registration.find({
          eventId: event._id,
          status: 'confirmed',
          'notifications.reminderSent': false,
        });

        logger.info(`Sending reminders to ${confirmedRegistrations.length} participants for event: ${event.title}`);

        for (const registration of confirmedRegistrations) {
          try {
            // Send email reminder
            await emailService.sendEventReminderEmail(registration, event);

            // Send WhatsApp reminder
            await whatsappService.sendEventReminder(registration, event);

            // Send in-app notification
            await notificationService.sendNotification({
              userId: registration.userId.toString(),
              type: 'event_reminder',
              title: `Pengingat Event: ${event.title}`,
              message: `Event akan dimulai besok pada ${event.schedule.start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB. Jangan lupa datang ya!`,
              actionUrl: `/events/${event._id}`,
              metadata: { eventId: event._id, registrationId: registration._id },
            });

            // Mark reminder as sent
            registration.notifications.reminderSent = true;
            await registration.save();

            totalReminders++;
          } catch (error) {
            logger.error(`Failed to send reminder to ${registration.participant.email}:`, error);
          }
        }
      } catch (error) {
        logger.error(`Failed to process reminders for event ${event._id}:`, error);
      }
    }

    logger.info(`✅ Event reminder job completed: ${totalReminders} reminders sent`);
  } catch (error) {
    logger.error('❌ Event reminder job error:', error);
  }
});

/**
 * Send thank you messages after event ends
 * Runs every 2 hours
 */
export const sendThankYouMessagesJob = cron.schedule('0 */2 * * *', async () => {
  try {
    logger.info('🔄 Running thank you message job...');

    const now = new Date();
    const twoHoursAgo = subHours(now, 2);
    const fortyEightHoursAgo = subHours(now, 48);

    // Find events that ended in the last 2-48 hours
    const recentlyEndedEvents = await Event.find({
      'schedule.end': {
        $gte: fortyEightHoursAgo,
        $lte: twoHoursAgo,
      },
      status: { $in: ['completed', 'published'] },
    });

    logger.info(`Found ${recentlyEndedEvents.length} recently ended events`);

    let sentCount = 0;

    for (const event of recentlyEndedEvents) {
      try {
        // Get attended registrations
        const attendedRegistrations = await Registration.find({
          eventId: event._id,
          status: 'attended',
          'notifications.thankYouSent': false,
        });

        for (const registration of attendedRegistrations) {
          try {
            // Send thank you email
            await emailService.sendEmail({
              to: registration.participant.email,
              subject: `Terima Kasih Telah Mengikuti ${event.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #10b981;">🎉 Terima Kasih!</h2>
                  <p>Halo ${registration.participant.fullName},</p>
                  <p>Terima kasih telah mengikuti event <strong>${event.title}</strong>!</p>
                  <p>Kami berharap Anda mendapatkan pengalaman yang bermanfaat.</p>
                  <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 0;">Bantu kami menjadi lebih baik dengan memberikan review Anda!</p>
                  </div>
                  <a href="${process.env.CLIENT_URL}/events/${event._id}/review" 
                     style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 6px; margin: 16px 0;">
                    Berikan Review
                  </a>
                  <p style="color: #666; font-size: 14px; margin-top: 24px;">
                    Sampai jumpa di event berikutnya! 👋
                  </p>
                </div>
              `,
            });

            // Mark as sent
            registration.notifications.thankYouSent = true;
            await registration.save();

            sentCount++;
          } catch (error) {
            logger.error(`Failed to send thank you to ${registration.participant.email}:`, error);
          }
        }
      } catch (error) {
        logger.error(`Failed to process thank you for event ${event._id}:`, error);
      }
    }

    logger.info(`✅ Thank you message job completed: ${sentCount} messages sent`);
  } catch (error) {
    logger.error('❌ Thank you message job error:', error);
  }
});

/**
 * Start all reminder cron jobs
 */
export const startReminderJobs = () => {
  sendPaymentRemindersJob.start();
  sendEventRemindersJob.start();
  sendThankYouMessagesJob.start();
  logger.info('✅ Reminder cron jobs started');
};

/**
 * Stop all reminder cron jobs
 */
export const stopReminderJobs = () => {
  sendPaymentRemindersJob.stop();
  sendEventRemindersJob.stop();
  sendThankYouMessagesJob.stop();
  logger.info('⏹️  Reminder cron jobs stopped');
};
