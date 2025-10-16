import { Request, Response, NextFunction } from 'express';
import eventService from '../services/event.service';
import { sendSuccess, sendError, sendCreated } from '../utils/response';
import logger from '../utils/logger';

/**
 * Create new event
 */
export const createEvent = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const eventData = {
      ...req.body,
      organizerId: userId,
    };

    const event = await eventService.createEvent(eventData);

    sendCreated(res, 'Event berhasil dibuat', event);
  } catch (error: any) {
    logger.error('Create event error:', error);
    sendError(res, error.message || 'Gagal membuat event', 400);
  }
};

/**
 * Get all events with filters
 */
export const getEvents = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      city,
      startDate,
      endDate,
      minPrice,
      maxPrice,
      venueType,
      sortBy = 'schedule.start',
      sortOrder = 'asc',
    } = req.query;

    const result = await eventService.getEvents({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      category: category as string,
      city: city as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      venueType: venueType as 'offline' | 'online' | 'hybrid' | undefined,
      sortBy: sortBy as 'date' | 'price' | 'popular' | 'newest' | undefined,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    sendSuccess(res, 'Events berhasil diambil', result);
  } catch (error: any) {
    logger.error('Get events error:', error);
    sendError(res, error.message || 'Gagal mengambil events', 400);
  }
};

/**
 * Get event by ID
 */
export const getEventById = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await eventService.getEventById(id, true);

    if (!event) {
      sendError(res, 'Event tidak ditemukan', 404);
      return;
    }

    sendSuccess(res, 'Event berhasil diambil', event);
  } catch (error: any) {
    logger.error('Get event by ID error:', error);
    sendError(res, error.message || 'Gagal mengambil event', 400);
  }
};

/**
 * Get event by slug
 */
export const getEventBySlug = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { slug } = req.params;

    const event = await eventService.getEventBySlug(slug, true);

    if (!event) {
      sendError(res, 'Event tidak ditemukan', 404);
      return;
    }

    sendSuccess(res, 'Event berhasil diambil', event);
  } catch (error: any) {
    logger.error('Get event by slug error:', error);
    sendError(res, error.message || 'Gagal mengambil event', 400);
  }
};

/**
 * Update event
 */
export const updateEvent = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const event = await eventService.updateEvent(id, userId, req.body);

    sendSuccess(res, 'Event berhasil diupdate', event);
  } catch (error: any) {
    logger.error('Update event error:', error);
    sendError(res, error.message || 'Gagal mengupdate event', 400);
  }
};

/**
 * Delete event
 */
export const deleteEvent = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    await eventService.deleteEvent(id, userId);

    sendSuccess(res, 'Event berhasil dihapus', null);
  } catch (error: any) {
    logger.error('Delete event error:', error);
    sendError(res, error.message || 'Gagal menghapus event', 400);
  }
};

/**
 * Submit event for approval
 */
export const submitForApproval = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const event = await eventService.submitForApproval(id, userId);

    sendSuccess(res, 'Event berhasil diajukan untuk persetujuan', event);
  } catch (error: any) {
    logger.error('Submit for approval error:', error);
    sendError(res, error.message || 'Gagal mengajukan event', 400);
  }
};

/**
 * Approve event (admin only)
 */
export const approveEvent = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const event = await eventService.approveEvent(id, userId);

    sendSuccess(res, 'Event berhasil disetujui', event);
  } catch (error: any) {
    logger.error('Approve event error:', error);
    sendError(res, error.message || 'Gagal menyetujui event', 400);
  }
};

/**
 * Reject event (admin only)
 */
export const rejectEvent = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { rejectionReason } = req.body;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const event = await eventService.rejectEvent(id, userId, rejectionReason);

    sendSuccess(res, 'Event berhasil ditolak', event);
  } catch (error: any) {
    logger.error('Reject event error:', error);
    sendError(res, error.message || 'Gagal menolak event', 400);
  }
};

/**
 * Publish event (admin only)
 */
export const publishEvent = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const event = await eventService.publishEvent(id, userId);

    sendSuccess(res, 'Event berhasil dipublikasikan', event);
  } catch (error: any) {
    logger.error('Publish event error:', error);
    sendError(res, error.message || 'Gagal mempublikasikan event', 400);
  }
};

/**
 * Cancel event
 */
export const cancelEvent = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { cancellationReason } = req.body;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const event = await eventService.cancelEvent(id, userId, cancellationReason);

    sendSuccess(res, 'Event berhasil dibatalkan', event);
  } catch (error: any) {
    logger.error('Cancel event error:', error);
    sendError(res, error.message || 'Gagal membatalkan event', 400);
  }
};

/**
 * Increment share count
 */
export const shareEvent = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    await eventService.incrementShareCount(id);

    sendSuccess(res, 'Share count berhasil diupdate', null);
  } catch (error: any) {
    logger.error('Share event error:', error);
    sendError(res, error.message || 'Gagal mengupdate share count', 400);
  }
};

/**
 * Get organizer events
 */
export const getOrganizerEvents = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const events = await eventService.getOrganizerEvents(userId);

    sendSuccess(res, 'Organizer events berhasil diambil', events);
  } catch (error: any) {
    logger.error('Get organizer events error:', error);
    sendError(res, error.message || 'Gagal mengambil organizer events', 400);
  }
};

/**
 * Get event statistics
 */
export const getEventStatistics = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const stats = await eventService.getEventStatistics(id);

    sendSuccess(res, 'Event statistics berhasil diambil', stats);
  } catch (error: any) {
    logger.error('Get event statistics error:', error);
    sendError(res, error.message || 'Gagal mengambil statistics', 400);
  }
};
