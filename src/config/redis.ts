import Redis from 'ioredis';
import config from './index';
import logger from '../utils/logger';

class RedisClient {
  private static instance: RedisClient;
  private client: Redis;
  private isConnected: boolean = false;

  private constructor() {
    this.client = new Redis(config.redis.url, {
      password: config.redis.password,
      db: config.redis.db,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.warn('Redis client connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.disconnect();
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public getClient(): Redis {
    return this.client;
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis client disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting Redis client:', error);
      throw error;
    }
  }

  public isHealthy(): boolean {
    return this.isConnected && this.client.status === 'ready';
  }

  // Cache methods with TTL
  public async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
      throw error;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      throw error;
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
      throw error;
    }
  }

  public async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      logger.error(`Error deleting cache pattern ${pattern}:`, error);
      throw error;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking cache key existence ${key}:`, error);
      throw error;
    }
  }

  public async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.client.expire(key, ttl);
    } catch (error) {
      logger.error(`Error setting expiry for cache key ${key}:`, error);
      throw error;
    }
  }

  public async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error(`Error incrementing cache key ${key}:`, error);
      throw error;
    }
  }

  public async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error) {
      logger.error(`Error decrementing cache key ${key}:`, error);
      throw error;
    }
  }

  // Session methods
  public async setSession(sessionId: string, data: any, ttl: number = 604800): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttl);
  }

  public async getSession<T>(sessionId: string): Promise<T | null> {
    return await this.get<T>(`session:${sessionId}`);
  }

  public async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // Rate limiting
  public async incrementRateLimit(key: string, windowMs: number): Promise<number> {
    const rateLimitKey = `ratelimit:${key}`;
    const current = await this.incr(rateLimitKey);
    
    if (current === 1) {
      await this.expire(rateLimitKey, Math.ceil(windowMs / 1000));
    }
    
    return current;
  }

  public async getRateLimitCount(key: string): Promise<number> {
    const rateLimitKey = `ratelimit:${key}`;
    const value = await this.client.get(rateLimitKey);
    return value ? parseInt(value, 10) : 0;
  }
}

export default RedisClient.getInstance();
