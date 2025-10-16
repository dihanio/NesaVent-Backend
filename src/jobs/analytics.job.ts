import cron from 'node-cron';
import Event from '../models/Event';
import Registration from '../models/Registration';
import Review from '../models/Review';
import Analytic from '../models/Analytic';
import User from '../models/User';
import logger from '../utils/logger';
import { startOfDay, endOfDay, subDays } from 'date-fns';

/**
 * Aggregate daily analytics
 * Runs every day at 1 AM
 */
export const aggregateDailyAnalyticsJob = cron.schedule('0 1 * * *', async () => {
  try {
    logger.info('🔄 Running daily analytics aggregation...');

    const yesterday = subDays(new Date(), 1);
    const startDate = startOfDay(yesterday);
    const endDate = endOfDay(yesterday);

    // Get all events
    const events = await Event.find({
      createdAt: { $lte: endDate },
    });

    let processedCount = 0;

    for (const event of events) {
      try {
        // Get registrations for yesterday
        const registrations = await Registration.find({
          eventId: event._id,
          createdAt: { $gte: startDate, $lte: endDate },
        });

        // Calculate revenue
        const revenue = registrations.reduce((sum, reg) => {
          if (reg.payment.status === 'paid') {
            return sum + reg.payment.totalAmount;
          }
          return sum;
        }, 0);

        // Get reviews
        const reviews = await Review.find({
          eventId: event._id,
          createdAt: { $lte: endDate },
        });

        const avgRating = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

        // Demographics data
        const demographics = {
          byProdi: {} as Record<string, number>,
          byAngkatan: {} as Record<string, number>,
          byGender: {} as Record<string, number>,
        };

        const allRegistrations = await Registration.find({
          eventId: event._id,
          createdAt: { $lte: endDate },
        });

        allRegistrations.forEach((reg) => {
          // By prodi
          if (reg.participant.prodi) {
            demographics.byProdi[reg.participant.prodi] =
              (demographics.byProdi[reg.participant.prodi] || 0) + 1;
          }

          // By angkatan
          if (reg.participant.angkatan) {
            demographics.byAngkatan[reg.participant.angkatan] =
              (demographics.byAngkatan[reg.participant.angkatan] || 0) + 1;
          }
        });

        // Calculate conversion rate
        const conversion = event.stats.viewCount > 0
          ? (allRegistrations.length / event.stats.viewCount) * 100
          : 0;

        // Create or update analytic record
        await Analytic.findOneAndUpdate(
          {
            eventId: event._id,
            date: startDate,
          },
          {
            eventId: event._id,
            organizerId: event.organizerId,
            date: startDate,
            metrics: {
              views: event.stats.viewCount,
              registrations: allRegistrations.length,
              revenue: event.stats.totalRevenue,
              conversion: Math.round(conversion * 100) / 100,
              avgRating: Math.round(avgRating * 10) / 10,
            },
            demographics,
          },
          { upsert: true, new: true }
        );

        processedCount++;
      } catch (error) {
        logger.error(`Failed to aggregate analytics for event ${event._id}:`, error);
      }
    }

    logger.info(`✅ Daily analytics aggregation completed: ${processedCount} events processed`);
  } catch (error) {
    logger.error('❌ Daily analytics aggregation error:', error);
  }
});

/**
 * Update event statistics
 * Runs every 6 hours
 */
export const updateEventStatisticsJob = cron.schedule('0 */6 * * *', async () => {
  try {
    logger.info('🔄 Running event statistics update...');

    const events = await Event.find({ status: { $in: ['published', 'ongoing', 'completed'] } });

    let updatedCount = 0;

    for (const event of events) {
      try {
        // Count registrations
        const [confirmedCount, totalRevenue, reviews] = await Promise.all([
          Registration.countDocuments({
            eventId: event._id,
            status: { $in: ['confirmed', 'attended'] },
          }),
          Registration.aggregate([
            {
              $match: {
                eventId: event._id,
                'payment.status': 'paid',
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$payment.totalAmount' },
              },
            },
          ]),
          Review.find({ eventId: event._id }),
        ]);

        // Calculate total sold tickets
        let totalSold = 0;
        event.ticketTypes.forEach((ticket) => {
          totalSold += ticket.sold;
        });

        // Calculate average rating
        const avgRating = reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

        // Update event statistics
        event.stats.totalSold = totalSold;
        event.stats.totalRevenue = totalRevenue[0]?.total || 0;
        event.rating = Math.round(avgRating * 10) / 10;
        event.reviewCount = reviews.length;

        await event.save();

        updatedCount++;
      } catch (error) {
        logger.error(`Failed to update statistics for event ${event._id}:`, error);
      }
    }

    logger.info(`✅ Event statistics update completed: ${updatedCount} events updated`);
  } catch (error) {
    logger.error('❌ Event statistics update error:', error);
  }
});

/**
 * Auto-complete past events
 * Runs every day at 2 AM
 */
export const autoCompleteEventsJob = cron.schedule('0 2 * * *', async () => {
  try {
    logger.info('🔄 Running auto-complete events job...');

    const now = new Date();

    // Find events that have ended but not marked as completed
    const pastEvents = await Event.find({
      'schedule.end': { $lt: now },
      status: { $in: ['published', 'ongoing'] },
    });

    logger.info(`Found ${pastEvents.length} past events to complete`);

    let completedCount = 0;

    for (const event of pastEvents) {
      try {
        event.status = 'completed';
        event.completedAt = new Date();
        await event.save();

        // Update no-show registrations
        await Registration.updateMany(
          {
            eventId: event._id,
            status: 'confirmed',
          },
          {
            $set: { status: 'no_show' },
          }
        );

        completedCount++;
      } catch (error) {
        logger.error(`Failed to complete event ${event._id}:`, error);
      }
    }

    logger.info(`✅ Auto-complete events job completed: ${completedCount} events marked as completed`);
  } catch (error) {
    logger.error('❌ Auto-complete events job error:', error);
  }
});

/**
 * Start all analytics cron jobs
 */
export const startAnalyticsJobs = () => {
  aggregateDailyAnalyticsJob.start();
  updateEventStatisticsJob.start();
  autoCompleteEventsJob.start();
  logger.info('✅ Analytics cron jobs started');
};

/**
 * Stop all analytics cron jobs
 */
export const stopAnalyticsJobs = () => {
  aggregateDailyAnalyticsJob.stop();
  updateEventStatisticsJob.stop();
  autoCompleteEventsJob.stop();
  logger.info('⏹️  Analytics cron jobs stopped');
};
