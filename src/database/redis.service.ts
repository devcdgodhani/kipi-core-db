import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private readonly defaultTtl: number;

  constructor(private configService: ConfigService) {
    this.defaultTtl = configService.get<number>('redis.ttl', 3600);

    this.client = new Redis({
      host: configService.get<string>('redis.host', 'localhost'),
      port: configService.get<number>('redis.port', 6379),
      password: configService.get<string>('redis.password') || undefined,
      db: configService.get<number>('redis.db', 0),
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableOfflineQueue: false,
    });

    this.client.on('connect', () => this.logger.log('✅ Redis connected'));
    this.client.on('error', (err) => this.logger.error('❌ Redis error', err.message));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  /**
   * Set a serialized JSON value with optional TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const expiry = ttl ?? this.defaultTtl;

    if (expiry > 0) {
      await this.client.setex(key, expiry, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  /**
   * Get and deserialize a JSON value
   */
  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Delete one or more keys
   */
  async del(...keys: string[]): Promise<void> {
    if (keys.length) await this.client.del(...keys);
  }

  /**
   * Delete all keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length) await this.client.del(...keys);
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  /**
   * Set expiry on an existing key
   */
  async expire(key: string, ttl: number): Promise<void> {
    await this.client.expire(key, ttl);
  }

  /**
   * Increment a numeric counter
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * Get the raw ioredis client (for advanced ops)
   */
  getClient(): Redis {
    return this.client;
  }
}
