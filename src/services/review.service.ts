import mongoose from 'mongoose';
import Review, { IReview } from '../models/Review';
import Event from '../models/Event';
import Registration from '../models/Registration';
import User from '../models/User';
import logger from '../utils/logger';

export interface CreateReviewData {
  eventId: string;
  userId: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewData {
  rating?: number;
  comment?: string;
}

export interface RespondToReviewData {
  response: string;
  responderId: string;
}

class ReviewService {
  /**
   * Create review
   */
  async createReview(data: CreateReviewData): Promise<IReview> {
    try {
      // Check if event exists
      const event = await Event.findById(data.eventId);
      if (!event) {
        throw new Error('Event tidak ditemukan');
      }

      // Check if user attended the event
      const registration = await Registration.findOne({
        eventId: data.eventId,
        userId: data.userId,
        status: 'attended',
      });

      if (!registration) {
        throw new Error('Anda harus menghadiri event untuk memberikan review');
      }

      // Check if user already reviewed
      const existingReview = await Review.findOne({
        eventId: data.eventId,
        userId: data.userId,
      });

      if (existingReview) {
        throw new Error('Anda sudah memberikan review untuk event ini');
      }

      // Validate rating
      if (data.rating < 1 || data.rating > 5) {
        throw new Error('Rating harus antara 1 dan 5');
      }

      // Create review
      const review = await Review.create({
        eventId: data.eventId,
        userId: data.userId,
        registrationId: registration._id,
        organizerId: event.organizerId,
        rating: data.rating,
        comment: data.comment,
      });

      // Update event rating
      await this.updateEventRating(data.eventId);

      logger.info(`Review created for event ${data.eventId} by user ${data.userId}`);

      return review;
    } catch (error: any) {
      logger.error('Create review error:', error);
      throw error;
    }
  }

  /**
   * Update review
   */
  async updateReview(reviewId: string, userId: string, data: UpdateReviewData): Promise<IReview> {
    try {
      const review = await Review.findById(reviewId);
      if (!review) {
        throw new Error('Review tidak ditemukan');
      }

      if (review.userId.toString() !== userId) {
        throw new Error('Akses tidak diizinkan');
      }

      if (data.rating !== undefined) {
        if (data.rating < 1 || data.rating > 5) {
          throw new Error('Rating harus antara 1 dan 5');
        }
        review.rating = data.rating;
      }

      if (data.comment !== undefined) {
        review.comment = data.comment;
      }

      await review.save();

      // Update event rating
      await this.updateEventRating(review.eventId.toString());

      logger.info(`Review ${reviewId} updated`);

      return review;
    } catch (error: any) {
      logger.error('Update review error:', error);
      throw error;
    }
  }

  /**
   * Delete review
   */
  async deleteReview(reviewId: string, userId: string): Promise<void> {
    try {
      const review = await Review.findById(reviewId);
      if (!review) {
        throw new Error('Review tidak ditemukan');
      }

      if (review.userId.toString() !== userId) {
        throw new Error('Akses tidak diizinkan');
      }

      const eventId = review.eventId.toString();
      await Review.deleteOne({ _id: reviewId });

      // Update event rating
      await this.updateEventRating(eventId);

      logger.info(`Review ${reviewId} deleted`);
    } catch (error: any) {
      logger.error('Delete review error:', error);
      throw error;
    }
  }

  /**
   * Respond to review (organizer)
   */
  async respondToReview(reviewId: string, data: RespondToReviewData): Promise<IReview> {
    try {
      const review = await Review.findById(reviewId);
      if (!review) {
        throw new Error('Review tidak ditemukan');
      }

      // Check if responder is the organizer
      if (!review.organizerId || review.organizerId.toString() !== data.responderId) {
        throw new Error('Hanya organizer yang dapat merespons review');
      }

      review.response = {
        text: data.response,
        respondedBy: new mongoose.Types.ObjectId(data.responderId),
        respondedAt: new Date(),
      };

      await review.save();

      logger.info(`Review ${reviewId} responded by organizer`);

      return review;
    } catch (error: any) {
      logger.error('Respond to review error:', error);
      throw error;
    }
  }

  /**
   * Mark review as helpful
   */
  async markAsHelpful(reviewId: string, userId: string): Promise<IReview> {
    try {
      const review = await Review.findById(reviewId);
      if (!review) {
        throw new Error('Review tidak ditemukan');
      }

      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Initialize helpfulMarks if undefined
      if (!review.helpfulMarks) {
        review.helpfulMarks = [];
      }

      const isAlreadyMarked = review.helpfulMarks.some((id) => id.toString() === userId);

      if (isAlreadyMarked) {
        // Already marked, remove it
        review.helpfulMarks = review.helpfulMarks.filter((id) => id.toString() !== userId);
        review.helpfulCount = Math.max(0, review.helpfulCount - 1);
      } else {
        // Add helpful mark
        review.helpfulMarks.push(userObjectId);
        review.helpfulCount += 1;
      }

      await review.save();

      logger.info(`Review ${reviewId} helpful mark toggled by user ${userId}`);

      return review;
    } catch (error: any) {
      logger.error('Mark as helpful error:', error);
      throw error;
    }
  }

  /**
   * Get event reviews
   */
  async getEventReviews(eventId: string, page: number = 1, limit: number = 10): Promise<{ reviews: IReview[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        Review.find({ eventId })
          .populate('userId', 'profile.fullName profile.avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Review.countDocuments({ eventId }),
      ]);

      return { reviews: reviews as unknown as IReview[], total };
    } catch (error: any) {
      logger.error('Get event reviews error:', error);
      throw error;
    }
  }

  /**
   * Get user reviews
   */
  async getUserReviews(userId: string): Promise<IReview[]> {
    try {
      const reviews = await Review.find({ userId })
        .populate('eventId', 'title posterUrl schedule')
        .sort({ createdAt: -1 })
        .lean();

      return reviews as unknown as IReview[];
    } catch (error: any) {
      logger.error('Get user reviews error:', error);
      throw error;
    }
  }

  /**
   * Get organizer reviews
   */
  async getOrganizerReviews(organizerId: string, page: number = 1, limit: number = 10): Promise<{ reviews: IReview[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        Review.find({ organizerId })
          .populate('userId', 'profile.fullName profile.avatar')
          .populate('eventId', 'title posterUrl')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Review.countDocuments({ organizerId }),
      ]);

      return { reviews: reviews as unknown as IReview[], total };
    } catch (error: any) {
      logger.error('Get organizer reviews error:', error);
      throw error;
    }
  }

  /**
   * Update event rating
   */
  private async updateEventRating(eventId: string): Promise<void> {
    try {
      const reviews = await Review.find({ eventId });

      if (reviews.length === 0) {
        await Event.findByIdAndUpdate(eventId, {
          rating: 0,
          reviewCount: 0,
        });
        return;
      }

      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      await Event.findByIdAndUpdate(eventId, {
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        reviewCount: reviews.length,
      });

      logger.info(`Event ${eventId} rating updated: ${averageRating} (${reviews.length} reviews)`);
    } catch (error: any) {
      logger.error('Update event rating error:', error);
      throw error;
    }
  }

  /**
   * Get review statistics
   */
  async getReviewStatistics(eventId: string): Promise<any> {
    try {
      const reviews = await Review.find({ eventId });

      const ratingDistribution = {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      };

      reviews.forEach((review) => {
        ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
      });

      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
        : 0;

      return {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution,
      };
    } catch (error: any) {
      logger.error('Get review statistics error:', error);
      throw error;
    }
  }
}

export default new ReviewService();
