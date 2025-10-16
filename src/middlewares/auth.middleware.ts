import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import User, { IUser } from '../models/User';
import { sendUnauthorized, sendForbidden } from '../utils/response';
import logger from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
    }
  }
}

/**
 * Middleware to authenticate user using JWT
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendUnauthorized(res, 'Token tidak ditemukan. Silakan login terlebih dahulu.');
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    try {
      // Verify token
      const payload = verifyAccessToken(token);

      // Get user from database
      const user = await User.findById(payload.userId);

      if (!user) {
        sendUnauthorized(res, 'User tidak ditemukan');
        return;
      }

      if (!user.emailVerified) {
        sendUnauthorized(res, 'Email belum diverifikasi');
        return;
      }

      // Attach user to request
      req.user = user;
      req.userId = user._id.toString();

      next();
    } catch (error) {
      logger.error('Token verification error:', error);
      sendUnauthorized(res, 'Token tidak valid atau sudah kedaluwarsa');
      return;
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    sendUnauthorized(res, 'Autentikasi gagal');
    return;
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res, 'Autentikasi diperlukan');
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendForbidden(res, 'Anda tidak memiliki akses ke resource ini');
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user is an admin
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendUnauthorized(res, 'Autentikasi diperlukan');
    return;
  }

  if (req.user.role !== 'admin') {
    sendForbidden(res, 'Akses khusus admin');
    return;
  }

  next();
};

/**
 * Middleware to check if user is an organization
 */
export const isOrganization = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendUnauthorized(res, 'Autentikasi diperlukan');
    return;
  }

  if (req.user.role !== 'organization') {
    sendForbidden(res, 'Akses khusus organisasi');
    return;
  }

  if (req.user.organization?.verificationStatus !== 'verified') {
    sendForbidden(res, 'Organisasi Anda belum diverifikasi');
    return;
  }

  next();
};

/**
 * Middleware to check if user is a verified organization or admin
 */
export const isOrganizationOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendUnauthorized(res, 'Autentikasi diperlukan');
    return;
  }

  const isVerifiedOrg = 
    req.user.role === 'organization' && 
    req.user.organization?.verificationStatus === 'verified';
  
  const isAdminUser = req.user.role === 'admin';

  if (!isVerifiedOrg && !isAdminUser) {
    sendForbidden(res, 'Akses ditolak');
    return;
  }

  next();
};

/**
 * Middleware to check if user is a student
 */
export const isStudent = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    sendUnauthorized(res, 'Autentikasi diperlukan');
    return;
  }

  if (req.user.role !== 'student' && req.user.role !== 'organization') {
    sendForbidden(res, 'Akses khusus mahasiswa');
    return;
  }

  next();
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.userId);

      if (user && user.emailVerified) {
        req.user = user;
        req.userId = user._id.toString();
      }
    } catch (error) {
      // Token invalid, but continue without user
      logger.debug('Optional auth token invalid:', error);
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next();
  }
};
