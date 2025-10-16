import logger from '../utils/logger';
import { startPaymentJobs, stopPaymentJobs } from './payment.job';
import { startReminderJobs, stopReminderJobs } from './reminder.job';
import { startAnalyticsJobs, stopAnalyticsJobs } from './analytics.job';
import { startMaintenanceJobs, stopMaintenanceJobs } from './maintenance.job';

/**
 * Start all background jobs
 */
export const startAllJobs = () => {
  try {
    logger.info('🚀 Starting all background jobs...');

    // Payment-related jobs
    startPaymentJobs();

    // Reminder jobs
    startReminderJobs();

    // Analytics jobs
    startAnalyticsJobs();

    // Maintenance jobs
    startMaintenanceJobs();

    logger.info('✅ All background jobs started successfully');
  } catch (error) {
    logger.error('❌ Failed to start background jobs:', error);
    throw error;
  }
};

/**
 * Stop all background jobs
 */
export const stopAllJobs = () => {
  try {
    logger.info('⏹️  Stopping all background jobs...');

    stopPaymentJobs();
    stopReminderJobs();
    stopAnalyticsJobs();
    stopMaintenanceJobs();

    logger.info('✅ All background jobs stopped successfully');
  } catch (error) {
    logger.error('❌ Failed to stop background jobs:', error);
    throw error;
  }
};

/**
 * Get status of all jobs
 */
export const getJobsStatus = () => {
  return {
    payment: {
      expirePayments: 'Running every hour',
      cancelExpiredTransactions: 'Running every 6 hours',
    },
    reminders: {
      paymentReminders: 'Running every 6 hours',
      eventReminders: 'Running every hour',
      thankYouMessages: 'Running every 2 hours',
    },
    analytics: {
      dailyAggregation: 'Running daily at 1 AM',
      updateStatistics: 'Running every 6 hours',
      autoCompleteEvents: 'Running daily at 2 AM',
    },
    maintenance: {
      cleanNotifications: 'Running daily at 3 AM',
      cleanCache: 'Running every 12 hours',
      cleanSessions: 'Running every 6 hours',
      cleanTokens: 'Running daily at 4 AM',
      healthReport: 'Running daily at 5 AM',
    },
  };
};

export default {
  startAllJobs,
  stopAllJobs,
  getJobsStatus,
};
