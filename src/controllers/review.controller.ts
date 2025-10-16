import { Request, Response, NextFunction } from 'express';
import reviewService from '../services/review.service';
import { sendSuccess, sendError, sendCreated } from '../utils/response';
import logger from '../utils/logger';

/**
 * Create review
 */
export const createReview = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { eventId, rating, comment } = req.body;

    const review = await reviewService.createReview({
      eventId,
      userId,
      rating,
      comment,
    });

    sendCreated(res, 'Review berhasil dibuat', review);
  } catch (error: any) {
    logger.error('Create review error:', error);
    sendError(res, error.message || 'Gagal membuat review', 400);
  }
};

/**
 * Update review
 */
export const updateReview = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { rating, comment } = req.body;

    const review = await reviewService.updateReview(id, userId, { rating, comment });

    sendSuccess(res, 'Review berhasil diupdate', review);
  } catch (error: any) {
    logger.error('Update review error:', error);
    sendError(res, error.message || 'Gagal mengupdate review', 400);
  }
};

/**
 * Delete review
 */
export const deleteReview = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    await reviewService.deleteReview(id, userId);

    sendSuccess(res, 'Review berhasil dihapus', null);
  } catch (error: any) {
    logger.error('Delete review error:', error);
    sendError(res, error.message || 'Gagal menghapus review', 400);
  }
};

/**
 * Respond to review (organizer)
 */
export const respondToReview = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { response } = req.body;

    const review = await reviewService.respondToReview(id, {
      response,
      responderId: userId,
    });

    sendSuccess(res, 'Berhasil merespons review', review);
  } catch (error: any) {
    logger.error('Respond to review error:', error);
    sendError(res, error.message || 'Gagal merespons review', 400);
  }
};

/**
 * Mark review as helpful
 */
export const markAsHelpful = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const review = await reviewService.markAsHelpful(id, userId);

    sendSuccess(res, 'Helpful mark berhasil diupdate', review);
  } catch (error: any) {
    logger.error('Mark as helpful error:', error);
    sendError(res, error.message || 'Gagal mark as helpful', 400);
  }
};

/**
 * Get event reviews
 */
export const getEventReviews = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await reviewService.getEventReviews(eventId, Number(page), Number(limit));

    sendSuccess(res, 'Event reviews berhasil diambil', result);
  } catch (error: any) {
    logger.error('Get event reviews error:', error);
    sendError(res, error.message || 'Gagal mengambil reviews', 400);
  }
};

/**
 * Get user reviews
 */
export const getUserReviews = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const reviews = await reviewService.getUserReviews(userId);

    sendSuccess(res, 'User reviews berhasil diambil', reviews);
  } catch (error: any) {
    logger.error('Get user reviews error:', error);
    sendError(res, error.message || 'Gagal mengambil reviews', 400);
  }
};

/**
 * Get organizer reviews
 */
export const getOrganizerReviews = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { page = 1, limit = 10 } = req.query;

    const result = await reviewService.getOrganizerReviews(userId, Number(page), Number(limit));

    sendSuccess(res, 'Organizer reviews berhasil diambil', result);
  } catch (error: any) {
    logger.error('Get organizer reviews error:', error);
    sendError(res, error.message || 'Gagal mengambil reviews', 400);
  }
};

/**
 * Get review statistics
 */
export const getReviewStatistics = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { eventId } = req.params;

    const stats = await reviewService.getReviewStatistics(eventId);

    sendSuccess(res, 'Review statistics berhasil diambil', stats);
  } catch (error: any) {
    logger.error('Get review statistics error:', error);
    sendError(res, error.message || 'Gagal mengambil statistics', 400);
  }
};
