import { Request, Response, NextFunction } from 'express';
import notificationService from '../services/notification.service';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

/**
 * Get user notifications
 */
export const getNotifications = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { unreadOnly } = req.query;

    const notifications = await notificationService.getUserNotifications(
      userId.toString(),
      unreadOnly === 'true'
    );

    sendSuccess(res, 'Notifications berhasil diambil', notifications);
  } catch (error: any) {
    logger.error('Get notifications error:', error);
    sendError(res, error.message || 'Gagal mengambil notifications', 400);
  }
};

/**
 * Get unread count
 */
export const getUnreadCount = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const count = await notificationService.getUnreadCount(userId.toString());

    sendSuccess(res, 'Unread count berhasil diambil', { count });
  } catch (error: any) {
    logger.error('Get unread count error:', error);
    sendError(res, error.message || 'Gagal mengambil unread count', 400);
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { id } = req.params;

    await notificationService.markAsRead(id, userId.toString());

    sendSuccess(res, 'Notification berhasil ditandai sebagai dibaca', null);
  } catch (error: any) {
    logger.error('Mark as read error:', error);
    sendError(res, error.message || 'Gagal mark as read', 400);
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const count = await notificationService.markAllAsRead(userId.toString());

    sendSuccess(res, `${count} notifications ditandai sebagai dibaca`, { count });
  } catch (error: any) {
    logger.error('Mark all as read error:', error);
    sendError(res, error.message || 'Gagal mark all as read', 400);
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { id } = req.params;

    await notificationService.deleteNotification(id, userId.toString());

    sendSuccess(res, 'Notification berhasil dihapus', null);
  } catch (error: any) {
    logger.error('Delete notification error:', error);
    sendError(res, error.message || 'Gagal menghapus notification', 400);
  }
};
