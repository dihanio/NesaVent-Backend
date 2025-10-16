import { Request, Response, NextFunction } from 'express';
import checkinService from '../services/checkin.service';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

/**
 * Process check-in via QR code
 */
export const processCheckIn = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { qrCodeData, location, deviceInfo } = req.body;

    const result = await checkinService.processCheckIn({
      qrCodeData,
      checkedBy: userId,
      location,
      deviceInfo,
    });

    if (result.success) {
      sendSuccess(res, result.message, result.registration);
    } else {
      sendError(res, result.message, 400);
    }
  } catch (error: any) {
    logger.error('Process check-in error:', error);
    sendError(res, error.message || 'Gagal melakukan check-in', 400);
  }
};

/**
 * Bulk check-in
 */
export const bulkCheckIn = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { registrationIds, location, deviceInfo } = req.body;

    const result = await checkinService.bulkCheckIn(registrationIds, userId, location, deviceInfo);

    sendSuccess(res, `Bulk check-in completed: ${result.success} success, ${result.failed} failed`, result);
  } catch (error: any) {
    logger.error('Bulk check-in error:', error);
    sendError(res, error.message || 'Gagal melakukan bulk check-in', 400);
  }
};

/**
 * Get check-in statistics
 */
export const getCheckInStats = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { eventId } = req.params;

    const stats = await checkinService.getCheckInStats(eventId);

    sendSuccess(res, 'Check-in statistics berhasil diambil', stats);
  } catch (error: any) {
    logger.error('Get check-in stats error:', error);
    sendError(res, error.message || 'Gagal mengambil statistics', 400);
  }
};

/**
 * Get check-in list
 */
export const getCheckInList = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { status } = req.query;

    const list = await checkinService.getCheckInList(eventId, status as 'checked-in' | 'not-checked-in');

    sendSuccess(res, 'Check-in list berhasil diambil', list);
  } catch (error: any) {
    logger.error('Get check-in list error:', error);
    sendError(res, error.message || 'Gagal mengambil check-in list', 400);
  }
};

/**
 * Validate registration for check-in
 */
export const validateRegistration = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { registrationId } = req.params;

    const result = await checkinService.validateRegistration(registrationId);

    if (result.valid) {
      sendSuccess(res, result.message, result.registration);
    } else {
      sendError(res, result.message, 400);
    }
  } catch (error: any) {
    logger.error('Validate registration error:', error);
    sendError(res, error.message || 'Gagal memvalidasi registrasi', 400);
  }
};

/**
 * Undo check-in
 */
export const undoCheckIn = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { registrationId } = req.params;
    const { reason } = req.body;

    const registration = await checkinService.undoCheckIn(registrationId, userId, reason);

    sendSuccess(res, 'Check-in berhasil dibatalkan', registration);
  } catch (error: any) {
    logger.error('Undo check-in error:', error);
    sendError(res, error.message || 'Gagal membatalkan check-in', 400);
  }
};

/**
 * Export check-in data
 */
export const exportCheckInData = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { eventId } = req.params;

    const csv = await checkinService.exportCheckInData(eventId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=checkin-${eventId}.csv`);
    res.send(csv);
  } catch (error: any) {
    logger.error('Export check-in data error:', error);
    sendError(res, error.message || 'Gagal export check-in data', 400);
  }
};
