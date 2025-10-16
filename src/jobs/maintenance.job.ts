import cron from 'node-cron';
import notificationService from '../services/notification.service';
import redisClient from '../config/redis';
import logger from '../utils/logger';
import { subDays } from 'date-fns';

/**
 * Clean old notifications (older than 90 days)
 * Runs every day at 3 AM
 */
export const cleanOldNotificationsJob = cron.schedule('0 3 * * *', async () => {
  try {
    logger.info('🔄 Running notification cleanup job...');

    const deletedCount = await notificationService.cleanOldNotifications();

    logger.info(`✅ Notification cleanup completed: ${deletedCount} old notifications deleted`);
  } catch (error) {
    logger.error('❌ Notification cleanup job error:', error);
  }
});

/**
 * Clean expired Redis cache entries
 * Runs every 12 hours
 */
export const cleanExpiredCacheJob = cron.schedule('0 */12 * * *', async () => {
  try {
    logger.info('🔄 Running expired cache cleanup...');

    // Redis automatically removes expired keys, but we can do manual cleanup for specific patterns
    const patterns = ['event:*', 'user:*', 'registration:*'];

    let totalCleaned = 0;

    for (const pattern of patterns) {
      try {
        // Use the delPattern method from RedisClient
        await redisClient.delPattern(pattern);
        totalCleaned++;
      } catch (error) {
        logger.warn(`Failed to clean cache pattern ${pattern}:`, error);
      }
    }

    logger.info(`✅ Cache cleanup completed: ${totalCleaned} entries cleaned`);
  } catch (error) {
    logger.error('❌ Cache cleanup job error:', error);
  }
});

/**
 * Clean expired sessions
 * Runs every 6 hours
 */
export const cleanExpiredSessionsJob = cron.schedule('0 */6 * * *', async () => {
  try {
    logger.info('🔄 Running session cleanup...');

    // Get Redis client directly
    const client = redisClient.getClient();
    let cursor = '0';
    let cleanedCount = 0;

    do {
      const result = await client.scan(cursor, 'MATCH', 'session:*', 'COUNT', 100);
      cursor = result[0];
      const sessionKeys = result[1];

      for (const key of sessionKeys) {
        try {
          const ttl = await client.ttl(key);

          // If TTL is expired or about to expire in 1 hour
          if (ttl < 3600 && ttl !== -1) {
            await redisClient.del(key);
            cleanedCount++;
          }
        } catch (error) {
          logger.warn(`Failed to clean session ${key}:`, error);
        }
      }
    } while (cursor !== '0');

    logger.info(`✅ Session cleanup completed: ${cleanedCount} sessions cleaned`);
  } catch (error) {
    logger.error('❌ Session cleanup job error:', error);
  }
});

/**
 * Clean up old verification tokens
 * Runs every day at 4 AM
 */
export const cleanExpiredTokensJob = cron.schedule('0 4 * * *', async () => {
  try {
    logger.info('🔄 Running token cleanup...');

    const User = require('../models/User').default;
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Clean verification tokens
    const verificationResult = await User.updateMany(
      {
        emailVerified: false,
        verificationToken: { $exists: true, $ne: null },
        createdAt: { $lt: thirtyDaysAgo },
      },
      {
        $unset: { verificationToken: '' },
      }
    );

    // Clean reset password tokens
    const resetResult = await User.updateMany(
      {
        resetPasswordExpires: { $lt: new Date() },
        resetPasswordToken: { $exists: true, $ne: null },
      },
      {
        $unset: { resetPasswordToken: '', resetPasswordExpires: '' },
      }
    );

    logger.info(
      `✅ Token cleanup completed: ${verificationResult.modifiedCount} verification tokens, ${resetResult.modifiedCount} reset tokens cleaned`
    );
  } catch (error) {
    logger.error('❌ Token cleanup job error:', error);
  }
});

/**
 * Generate system health report
 * Runs every day at 5 AM
 */
export const generateHealthReportJob = cron.schedule('0 5 * * *', async () => {
  try {
    logger.info('🔄 Generating system health report...');

    const Event = require('../models/Event').default;
    const Registration = require('../models/Registration').default;
    const User = require('../models/User').default;

    const [
      totalEvents,
      totalRegistrations,
      totalUsers,
      activeEvents,
      pendingPayments,
      todayRevenue,
    ] = await Promise.all([
      Event.countDocuments(),
      Registration.countDocuments(),
      User.countDocuments(),
      Event.countDocuments({ status: { $in: ['published', 'ongoing'] } }),
      Registration.countDocuments({ 'payment.status': 'pending' }),
      Registration.aggregate([
        {
          $match: {
            'payment.status': 'paid',
            'payment.paidAt': {
              $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$payment.totalAmount' },
          },
        },
      ]),
    ]);

    const healthReport = {
      timestamp: new Date(),
      database: {
        totalEvents,
        totalRegistrations,
        totalUsers,
      },
      currentStatus: {
        activeEvents,
        pendingPayments,
        todayRevenue: todayRevenue[0]?.total || 0,
      },
    };

    logger.info('📊 System Health Report:', healthReport);
    logger.info('✅ Health report generated successfully');
  } catch (error) {
    logger.error('❌ Health report generation error:', error);
  }
});

/**
 * Start all maintenance cron jobs
 */
export const startMaintenanceJobs = () => {
  cleanOldNotificationsJob.start();
  cleanExpiredCacheJob.start();
  cleanExpiredSessionsJob.start();
  cleanExpiredTokensJob.start();
  generateHealthReportJob.start();
  logger.info('✅ Maintenance cron jobs started');
};

/**
 * Stop all maintenance cron jobs
 */
export const stopMaintenanceJobs = () => {
  cleanOldNotificationsJob.stop();
  cleanExpiredCacheJob.stop();
  cleanExpiredSessionsJob.stop();
  cleanExpiredTokensJob.stop();
  generateHealthReportJob.stop();
  logger.info('⏹️  Maintenance cron jobs stopped');
};
