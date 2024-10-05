import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import {
  DEFAULT_REDIS_NAMESPACE,
  RedisService
} from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

@Injectable()
export class TokenStoreService {
  static SECRET_TOKEN_STORE_KEY = 'SECRET_TOKEN_STORE_KEY_';
  static RESTORE_TOKEN_STORE_KEY = 'RESTORE_TOKEN_STORE_KEY_';
  redis: Redis;

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getClient(DEFAULT_REDIS_NAMESPACE);
  }

  async storeTokens(user: number, tokens: string[]) {
    await this.redis.set(
      `${TokenStoreService.SECRET_TOKEN_STORE_KEY}${user}`,
      tokens[0],
      'EX',
      360000000
    );
    await this.redis.set(
      `${TokenStoreService.RESTORE_TOKEN_STORE_KEY}${user}`,
      tokens[1],
      'EX',
      360000000000
    );
  }

  async getRefreshToken(user: number) {
    return this.redis.get(
      `${TokenStoreService.RESTORE_TOKEN_STORE_KEY}${user}`
    );
  }

  async getSecretToken(user: number) {
    return this.redis.get(`${TokenStoreService.SECRET_TOKEN_STORE_KEY}${user}`);
  }

  async deleteTokens(user: number) {
    await this.redis.del(`${TokenStoreService.SECRET_TOKEN_STORE_KEY}${user}`);
    await this.redis.del(`${TokenStoreService.RESTORE_TOKEN_STORE_KEY}${user}`);
  }

  async set(key: string, value: any, expire?: number) {
    return this.redis.set(key, value, 'EX', expire);
  }

  async get(key: string) {
    return this.redis.get(key);
  }

  async del(key: string) {
    return this.redis.del(key);
  }

  async tryLock(key: string, exp = 5000) {
    let value = await this.get(key);
    if (value) {
      return false;
    }
    await this.set(key, true, exp);
    return true;
  }

  async unlock(key: string) {
    return this.del(key);
  }
}
