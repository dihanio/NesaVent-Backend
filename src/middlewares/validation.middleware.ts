import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { sendValidationError } from '../utils/response';
import logger from '../utils/logger';

/**
 * Validation middleware factory
 */
export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body, query, and params
      const data = {
        body: req.body,
        query: req.query,
        params: req.params,
      };

      await schema.parseAsync(data);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Validation error:', errors);
        sendValidationError(res, 'Validation failed', errors);
        return;
      }

      logger.error('Validation middleware error:', error);
      sendValidationError(res, 'Validation error');
      return;
    }
  };
};

/**
 * Validate request body
 */
export const validateBody = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        sendValidationError(res, 'Data tidak valid', errors);
        return;
      }

      sendValidationError(res, 'Validation error');
      return;
    }
  };
};

/**
 * Validate request query
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        sendValidationError(res, 'Query parameters tidak valid', errors);
        return;
      }

      sendValidationError(res, 'Validation error');
      return;
    }
  };
};

/**
 * Validate request params
 */
export const validateParams = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        sendValidationError(res, 'Path parameters tidak valid', errors);
        return;
      }

      sendValidationError(res, 'Validation error');
      return;
    }
  };
};
