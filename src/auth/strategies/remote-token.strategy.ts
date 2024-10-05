import {Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {PassportStrategy} from '@nestjs/passport';
import {ExtractJwt, Strategy} from 'passport-jwt';

@Injectable()
export class AccessMqttTokenStrategy extends PassportStrategy(
    Strategy,
    'mqtt',
) {
    constructor(private config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.get<string>('JWT_ACCESS_SECRET_LOCKER'),
            ignoreExpiration: true,
        });
    }

    validate(payload: any) {
        return payload;
    }
}
