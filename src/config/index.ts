import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  env: string;
  port: number;
  apiUrl: string;
  clientUrl: string;
  mongodb: {
    uri: string;
    testUri: string;
  };
  redis: {
    url: string;
    password?: string;
    db: number;
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  email: {
    apiKey: string;
    from: string;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth?: {
        user: string;
        pass: string;
      };
    };
  };
  whatsapp: {
    apiKey: string;
    url: string;
  };
  fonnte: {
    token: string;
  };
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
  midtrans: {
    serverKey: string;
    clientKey: string;
    isProduction: boolean;
    merchantId: string;
  };
  sentry: {
    dsn: string;
  };
  security: {
    encryptionKey: string;
    bcryptRounds: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  session: {
    secret: string;
  };
  campus: {
    emailDomain: string;
  };
  payment: {
    expiryHours: number;
    platformFeePercentage: number;
  };
  upload: {
    maxFileSize: number;
    allowedImageTypes: string[];
  };
  timezone: string;
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nesavent',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/nesavent_test',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access_secret_change_me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh_secret_change_me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  email: {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'Nesavent <no-reply@nesavent.com>',
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || '',
      } : undefined,
    },
  },
  whatsapp: {
    apiKey: process.env.FONNTE_API_KEY || '',
    url: process.env.FONNTE_URL || 'https://api.fonnte.com/send',
  },
  fonnte: {
    token: process.env.FONNTE_API_KEY || '',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  midtrans: {
    serverKey: process.env.MIDTRANS_SERVER_KEY || '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    merchantId: process.env.MIDTRANS_MERCHANT_ID || '',
  },
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'change_this_32_char_key_prod!',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  session: {
    secret: process.env.SESSION_SECRET || 'session_secret_change_me',
  },
  campus: {
    emailDomain: process.env.CAMPUS_EMAIL_DOMAIN || '@student.ac.id',
  },
  payment: {
    expiryHours: parseInt(process.env.PAYMENT_EXPIRY_HOURS || '24', 10),
    platformFeePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || '3'),
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/jpg,image/webp').split(','),
  },
  timezone: process.env.DEFAULT_TIMEZONE || 'Asia/Jakarta',
};

export default config;
