import {Injectable} from '@nestjs/common';
import Redis from 'ioredis';
import {DEFAULT_REDIS_NAMESPACE, RedisService,} from '@liaoliaots/nestjs-redis';
import {PosDevice} from '../entities/PosDevice';


@Injectable()
export class PosService {
    static POS_STORE_KEY = 'POS_STORE_KEY_';
    redis: Redis;

    constructor(private readonly redisService: RedisService) {
        this.redis = this.redisService.getClient(DEFAULT_REDIS_NAMESPACE);
    }

    async get(key: number): Promise<any> {
        let data:any = await this.redis.get(`${PosService.POS_STORE_KEY}${key}`);
        if (!data) {
            data = await PosDevice.findOneBy({id: key});
            if (data) {
                await this.set(key, data);
            }
            return data;
        } else {
            return JSON.parse(data) as unknown;
        }
    }

    async set(key: number, value: any) {
        try {
            await this.redis.set(`${PosService.POS_STORE_KEY}${key}`,
                JSON.stringify(value), 'EX', 3600);
        } catch (e) {
            console.error(e)
        }
    }

    async del(key: number) {
        await this.redis.del(`${PosService.POS_STORE_KEY}${key}`);
    }
}
