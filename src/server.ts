import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import * as Sentry from '@sentry/node';
import config from './config';
import database from './config/database';
import redisClient from './config/redis';
import logger from './utils/logger';
import { sendSuccess } from './utils/response';

// Import routes
import routes from './routes';

// Import background jobs
import { startAllJobs, stopAllJobs } from './jobs';

const app: Express = express();

// Initialize Sentry for error tracking
if (config.sentry.dsn && config.env === 'production') {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.env,
    tracesSampleRate: 1.0,
  });
}

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom NoSQL injection prevention middleware for Express v5
// This replaces express-mongo-sanitize which has compatibility issues with Express v5
app.use((req: Request, _res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove $ and . from strings to prevent NoSQL injection
      return value.replace(/[$\.]/g, '');
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const key in value) {
        if (!key.startsWith('$') && !key.includes('.')) {
          sanitized[key] = sanitizeValue(value[key]);
        } else {
          logger.warn(`Blocked NoSQL injection attempt with key: ${key}`);
        }
      }
      return sanitized;
    }
    return value;
  };

  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize query params (Express v5 compatible)
  if (req.query && typeof req.query === 'object') {
    const sanitizedQuery: any = {};
    for (const key in req.query) {
      if (!key.startsWith('$') && !key.includes('.')) {
        sanitizedQuery[key] = sanitizeValue(req.query[key]);
      } else {
        logger.warn(`Blocked NoSQL injection attempt in query: ${key}`);
      }
    }
    
    // Replace query with sanitized version using defineProperty
    Object.defineProperty(req, 'query', {
      value: sanitizedQuery,
      writable: false,
      configurable: true,
      enumerable: true,
    });
  }

  // Sanitize params
  if (req.params && typeof req.params === 'object') {
    for (const key in req.params) {
      if (typeof req.params[key] === 'string') {
        req.params[key] = req.params[key].replace(/[$\.]/g, '');
      }
    }
  }

  next();
});

// Compression middleware
app.use(compression());

// Logging middleware
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
}

// Trust proxy
app.set('trust proxy', 1);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: database.isHealthy() ? 'connected' : 'disconnected',
    redis: redisClient.isHealthy() ? 'connected' : 'disconnected',
    environment: config.env,
  };

  res.status(200).json(healthStatus);
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, 'Nesavent API is running', {
    version: '1.0.0',
    documentation: `${config.apiUrl}/docs`,
    environment: config.env,
  });
});

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan',
  });
});

// Global error handler (Sentry is already setup above)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Global error handler:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    error: config.env === 'development' ? {
      message: err.message,
      stack: err.stack,
    } : undefined,
  });
});

// Start server function
async function startServer() {
  try {
    // Connect to MongoDB
    await database.connect();
    logger.info('✓ MongoDB connected successfully');

    // Check Redis connection
    if (redisClient.isHealthy()) {
      logger.info('✓ Redis connected successfully');
    } else {
      logger.warn('⚠ Redis connection not established');
    }

    // Start Express server
    const server = app.listen(config.port, () => {
      logger.info(`✓ Server is running on port ${config.port}`);
      logger.info(`✓ Environment: ${config.env}`);
      logger.info(`✓ API URL: ${config.apiUrl}`);
      logger.info('🚀 Nesavent Backend API is ready!');
    });

    // Start background jobs
    startAllJobs();
    logger.info('✓ Background jobs initialized');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Stop background jobs
          stopAllJobs();
          logger.info('Background jobs stopped');
          
          await database.disconnect();
          logger.info('Database disconnected');
          
          await redisClient.disconnect();
          logger.info('Redis disconnected');
          
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('UNHANDLED_REJECTION');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
