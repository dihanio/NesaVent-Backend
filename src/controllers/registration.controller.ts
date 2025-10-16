import { Request, Response, NextFunction } from 'express';
import registrationService from '../services/registration.service';
import { sendSuccess, sendError, sendCreated } from '../utils/response';
import logger from '../utils/logger';

/**
 * Create new registration
 */
export const createRegistration = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { eventId, ticketTypeId, quantity, participant } = req.body;

    const result = await registrationService.createRegistration({
      userId,
      eventId,
      ticketTypeId,
      quantity,
      participant,
    });

    sendCreated(res, 'Registrasi berhasil dibuat', result);
  } catch (error: any) {
    logger.error('Create registration error:', error);
    sendError(res, error.message || 'Gagal membuat registrasi', 400);
  }
};

/**
 * Get registration by ID
 */
export const getRegistrationById = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const registration = await registrationService.getRegistrationById(id, userId);

    if (!registration) {
      sendError(res, 'Registrasi tidak ditemukan', 404);
      return;
    }

    sendSuccess(res, 'Registrasi berhasil diambil', registration);
  } catch (error: any) {
    logger.error('Get registration by ID error:', error);
    sendError(res, error.message || 'Gagal mengambil registrasi', 400);
  }
};

/**
 * Get user registrations
 */
export const getUserRegistrations = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const { status } = req.query;

    const registrations = await registrationService.getUserRegistrations(userId, status as string);

    sendSuccess(res, 'User registrations berhasil diambil', registrations);
  } catch (error: any) {
    logger.error('Get user registrations error:', error);
    sendError(res, error.message || 'Gagal mengambil registrations', 400);
  }
};

/**
 * Get event registrations (for organizer)
 */
export const getEventRegistrations = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const registrations = await registrationService.getEventRegistrations(eventId, userId);

    sendSuccess(res, 'Event registrations berhasil diambil', registrations);
  } catch (error: any) {
    logger.error('Get event registrations error:', error);
    sendError(res, error.message || 'Gagal mengambil registrations', 400);
  }
};

/**
 * Cancel registration
 */
export const cancelRegistration = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { reason } = req.body;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const registration = await registrationService.cancelRegistration(id, userId, reason);

    sendSuccess(res, 'Registrasi berhasil dibatalkan', registration);
  } catch (error: any) {
    logger.error('Cancel registration error:', error);
    sendError(res, error.message || 'Gagal membatalkan registrasi', 400);
  }
};

/**
 * Download ticket PDF
 */
export const downloadTicket = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const registration = await registrationService.getRegistrationById(id, userId);

    if (!registration) {
      sendError(res, 'Registrasi tidak ditemukan', 404);
      return;
    }

    if (!registration.ticket.pdfUrl) {
      sendError(res, 'Tiket belum tersedia', 400);
      return;
    }

    // Return PDF URL for download
    sendSuccess(res, 'Download link berhasil diambil', {
      pdfUrl: registration.ticket.pdfUrl,
      ticketNumber: registration.ticket.ticketNumber,
    });
  } catch (error: any) {
    logger.error('Download ticket error:', error);
    sendError(res, error.message || 'Gagal mengunduh tiket', 400);
  }
};

/**
 * Get registration statistics
 */
export const getRegistrationStatistics = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { eventId } = req.params;

    const stats = await registrationService.getRegistrationStatistics(eventId);

    sendSuccess(res, 'Registration statistics berhasil diambil', stats);
  } catch (error: any) {
    logger.error('Get registration statistics error:', error);
    sendError(res, error.message || 'Gagal mengambil statistics', 400);
  }
};

/**
 * Export registrations to CSV
 */
export const exportRegistrations = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Tidak terauthorisasi', 401);
      return;
    }

    const csv = await registrationService.exportRegistrationsToCsv(eventId, userId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=registrations-${eventId}.csv`);
    res.send(csv);
  } catch (error: any) {
    logger.error('Export registrations error:', error);
    sendError(res, error.message || 'Gagal export registrations', 400);
  }
};
