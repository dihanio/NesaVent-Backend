import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const sendSuccess = <T = any>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200,
  meta?: ApiResponse['meta']
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta,
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  error?: any
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error : undefined,
  };
  return res.status(statusCode).json(response);
};

export const sendCreated = <T = any>(
  res: Response,
  message: string,
  data?: T
): Response => {
  return sendSuccess(res, message, data, 201);
};

export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

export const sendBadRequest = (
  res: Response,
  message: string = 'Permintaan tidak valid',
  error?: any
): Response => {
  return sendError(res, message, 400, error);
};

export const sendUnauthorized = (
  res: Response,
  message: string = 'Tidak terauthorisasi'
): Response => {
  return sendError(res, message, 401);
};

export const sendForbidden = (
  res: Response,
  message: string = 'Akses ditolak'
): Response => {
  return sendError(res, message, 403);
};

export const sendNotFound = (
  res: Response,
  message: string = 'Tidak ditemukan'
): Response => {
  return sendError(res, message, 404);
};

export const sendConflict = (
  res: Response,
  message: string = 'Konflik data',
  error?: any
): Response => {
  return sendError(res, message, 409, error);
};

export const sendValidationError = (
  res: Response,
  message: string = 'Validasi gagal',
  errors?: any
): Response => {
  return sendError(res, message, 422, errors);
};

export const sendTooManyRequests = (
  res: Response,
  message: string = 'Terlalu banyak permintaan'
): Response => {
  return sendError(res, message, 429);
};

export const sendInternalError = (
  res: Response,
  message: string = 'Terjadi kesalahan server',
  error?: any
): Response => {
  return sendError(res, message, 500, error);
};
