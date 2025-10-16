import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import redisClient from '../config/redis';
import config from '../config';
import { sendTooManyRequests } from '../utils/response';
import logger from '../utils/logger';

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes
  max: config.rateLimit.maxRequests, // limit each IP to 100 requests per windowMs
  message: 'Terlalu banyak request dari IP ini, silakan coba lagi nanti',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    sendTooManyRequests(res, 'Terlalu banyak request, silakan coba lagi nanti');
  },
});

/**
 * Authentication rate limiter (more strict)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // don't count successful requests
  message: 'Terlalu banyak percobaan login, silakan coba lagi dalam 15 menit',
  handler: (_req: Request, res: Response) => {
    sendTooManyRequests(res, 'Terlalu banyak percobaan login, silakan coba lagi dalam 15 menit');
  },
});

/**
 * Registration rate limiter
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 registrations per hour
  message: 'Terlalu banyak pendaftaran dari IP ini, silakan coba lagi dalam 1 jam',
  handler: (_req: Request, res: Response) => {
    sendTooManyRequests(res, 'Terlalu banyak pendaftaran, silakan coba lagi dalam 1 jam');
  },
});

/**
 * Event creation rate limiter
 */
export const eventCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 event creations per hour
  message: 'Terlalu banyak pembuatan event, silakan coba lagi nanti',
  handler: (_req: Request, res: Response) => {
    sendTooManyRequests(res, 'Terlalu banyak pembuatan event, silakan coba lagi nanti');
  },
});

/**
 * Registration creation rate limiter
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 registrations per hour
  message: 'Terlalu banyak pendaftaran event, silakan coba lagi nanti',
  handler: (_req: Request, res: Response) => {
    sendTooManyRequests(res, 'Terlalu banyak pendaftaran event, silakan coba lagi nanti');
  },
});

/**
 * Custom rate limiter using Redis
 */
export const customRateLimiter = (
  keyPrefix: string,
  maxRequests: number,
  windowSeconds: number
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const identifier = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${keyPrefix}:${identifier}`;

      const count = await redisClient.incrementRateLimit(key, windowSeconds * 1000);

      // Set headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count).toString());

      if (count > maxRequests) {
        logger.warn(`Rate limit exceeded for ${identifier}`);
        sendTooManyRequests(res, 'Rate limit exceeded');
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // Fail open - allow request if rate limiter fails
      next();
    }
  };
};

/**
 * Per-user rate limiter
 */
export const userRateLimiter = (maxRequests: number = 100, windowSeconds: number = 900) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return next(); // Skip if no user (will be caught by auth middleware)
      }

      const key = `user_rate_limit:${req.userId}`;
      const count = await redisClient.incrementRateLimit(key, windowSeconds * 1000);

      if (count > maxRequests) {
        logger.warn(`User rate limit exceeded for user ${req.userId}: ${count} requests`);
        return sendTooManyRequests(res, 'Terlalu banyak request, silakan coba lagi nanti');
      }

      next();
    } catch (error) {
      logger.error('User rate limiter error:', error);
      next();
    }
  };
};
