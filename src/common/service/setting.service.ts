import Redis from "ioredis";
import { DEFAULT_REDIS_NAMESPACE, RedisService } from "@liaoliaots/nestjs-redis";
import { Setting, SettingKey } from "../../base/entities/Setting";
import { Injectable } from "@nestjs/common";
import { AppConstant } from "../constant/app.constant";

@Injectable()
export class SettingService {
    static SETTING_STORE_KEY = 'SETTING_STORE_KEY_';
    redis: Redis;

    constructor(private readonly redisService: RedisService) {
        this.redis = this.redisService.getClient(DEFAULT_REDIS_NAMESPACE);
    }

    async get(key: any): Promise<any> {
        // let data = await this.redis.get(`${SettingService.SETTING_STORE_KEY}${key}`);
        // if (!data) {
        // data = await ;
        //     if (data) {
        //         await this.set(key, data);
        //     }
        return Setting.findByKey(key)
        // } else {
        //     return JSON.parse(data) as unknown;
        // }
    }

    async set(key: SettingKey, value: any) {
        try {
            await this.redis.set(`${SettingService.SETTING_STORE_KEY}${key}`,
                JSON.stringify(value), 'EX', 3600,);
        } catch (e) {
            console.error(e)
        }
    }

    async del(key: SettingKey) {
        await this.redis.del(`${SettingService.SETTING_STORE_KEY}${key}`);
    }

    async getDefaults() {
        let config = await this.get(SettingKey.SystemConfig);
        let theme = await this.get(SettingKey.ThemeConfig);
        let system = await this.get(SettingKey.SystemInfo);
        let slider = await this.get(SettingKey.AuthSlider);

        return {
            title: system?.title || 'GymSoft',
            config: config || {
                lang: AppConstant.DEFAULT_LANGUAGE,
                orderShowImage: false,
                calendar: AppConstant.DEFAULT_CALENDAR,
                dir: AppConstant.DEFAULT_DIR,
            },
            themeConfig: theme || {
                theme: AppConstant.DEFAULT_THEME,
                inputStyle: 'outlined',
                fontSize: AppConstant.DEFAULT_FONT_SIZE,
            },
            info: system || { title: 'GymSoft' },
            logo: system?.logo?.name,
            slider: slider?.items,
            lang: config?.lang || AppConstant.DEFAULT_LANGUAGE,
            dir: config?.dir || AppConstant.DEFAULT_DIR,
            theme: theme?.theme || AppConstant.DEFAULT_THEME,
            inputStyle: theme?.inputStyle === 'filled' ? 'p-input-filled' : '',
            fontSize: theme?.fontSize || AppConstant.DEFAULT_FONT_SIZE,
        };
    }
}