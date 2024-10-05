import {Inject, Injectable} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import {ExtractJwt, Strategy} from 'passport-jwt';
import {ConfigService} from "@nestjs/config";
import {Request} from "express";


@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {

    constructor(private config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.get<string>('JWT_ACCESS_SECRET')
        });
    }

    validate(payload: any) {
        return payload;
    }
}