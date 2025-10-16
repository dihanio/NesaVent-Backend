import cron from 'node-cron';
import Registration from '../models/Registration';
import Event from '../models/Event';
import paymentService from '../services/payment.service';
import eventService from '../services/event.service';
import logger from '../utils/logger';

/**
 * Expire pending payments after 24 hours
 * Runs every hour
 */
export const expirePaymentsJob = cron.schedule('0 * * * *', async () => {
  try {
    logger.info('🔄 Running payment expiration job...');

    const now = new Date();

    // Find all pending payments that have expired
    const expiredRegistrations = await Registration.find({
      'payment.status': 'pending',
      'payment.expiredAt': { $lte: now },
    });

    logger.info(`Found ${expiredRegistrations.length} expired payments`);

    let expiredCount = 0;

    for (const registration of expiredRegistrations) {
      try {
        // Update payment status to expired
        registration.payment.status = 'expired';
        registration.status = 'cancelled';
        registration.ticket.status = 'expired';

        await registration.save();

        // Release reserved tickets
        const event = await Event.findById(registration.eventId);
        if (event) {
          const ticketType = event.ticketTypes.find(
            (t) => t._id?.toString() === registration.ticketType.id.toString()
          );

          if (ticketType) {
            const newReserved = Math.max(0, ticketType.reserved - registration.quantity);
            await eventService.updateTicketAvailability(
              (event._id as any).toString(),
              ticketType._id!.toString(),
              ticketType.sold,
              newReserved
            );
          }
        }

        expiredCount++;
      } catch (error) {
        logger.error(`Failed to expire registration ${registration._id}:`, error);
      }
    }

    logger.info(`✅ Payment expiration job completed: ${expiredCount} payments expired`);
  } catch (error) {
    logger.error('❌ Payment expiration job error:', error);
  }
});

/**
 * Cancel Midtrans transactions for expired payments
 * Runs every 6 hours
 */
export const cancelExpiredTransactionsJob = cron.schedule('0 */6 * * *', async () => {
  try {
    logger.info('🔄 Running transaction cancellation job...');

    const expiredRegistrations = await Registration.find({
      'payment.status': 'expired',
      'payment.orderId': { $exists: true, $ne: null },
      updatedAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }, // Last 48 hours
    }).limit(100);

    logger.info(`Found ${expiredRegistrations.length} transactions to cancel`);

    let cancelledCount = 0;

    for (const registration of expiredRegistrations) {
      try {
        if (registration.payment.orderId) {
          await paymentService.cancelTransaction(registration.payment.orderId);
          cancelledCount++;
        }
      } catch (error) {
        // Ignore errors (transaction might already be cancelled)
        logger.warn(`Could not cancel transaction ${registration.payment.orderId}:`, error);
      }
    }

    logger.info(`✅ Transaction cancellation job completed: ${cancelledCount} transactions cancelled`);
  } catch (error) {
    logger.error('❌ Transaction cancellation job error:', error);
  }
});

/**
 * Start all payment-related cron jobs
 */
export const startPaymentJobs = () => {
  expirePaymentsJob.start();
  cancelExpiredTransactionsJob.start();
  logger.info('✅ Payment cron jobs started');
};

/**
 * Stop all payment-related cron jobs
 */
export const stopPaymentJobs = () => {
  expirePaymentsJob.stop();
  cancelExpiredTransactionsJob.stop();
  logger.info('⏹️  Payment cron jobs stopped');
};
