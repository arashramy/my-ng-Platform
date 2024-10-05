import {Injectable} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {Setting, SettingKey} from '../../base/entities/Setting';

@Injectable()
export class RemoteTokenService {
  constructor(private jwtService: JwtService) {
  }

  getToken() {
    return Setting.findOne({where: {key: SettingKey.locker}});
  }

  async generateToken() {
    const token = this.jwtService.sign(
        {},
        {
          expiresIn: process.env.EXPIRE_TIME,
          secret: process.env.JWT_ACCESS_SECRET_LOCKER,
        },
    );
    await Setting.update(
        {key: SettingKey.locker},
        {value: {data: token} as any},
    );
    return token;
  }
}
