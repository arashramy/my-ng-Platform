import {
  BadRequestException,
  ForbiddenException,
  Injectable
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthDto } from '../dto/AuthDto';
import { Role, User, UserStatus } from '../../base/entities/User';
import { SignUpDto } from '../dto/SignUpDto';
import { Utils } from '../../common/helper/utils.helper';
import {
  NotificationMessageTemplate,
  NotificationService,
  NotificationTemplateDTO
} from '../../notification/NotificationService';
import { HashHelper } from '../../common/helper/hash.helper';
import { ActivationDto } from '../dto/ActivationDto';
import { UsersService } from './users.service';
import { TokenStoreService } from './token-store.service';
import { EventsConstant } from '../../common/constant/events.constant';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { isEmail } from 'class-validator';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationService: NotificationService,
    private tokenStore: TokenStoreService,
    private eventEmitter: EventEmitter2
  ) {}

  async signUp(dto: SignUpDto): Promise<any> {
    const userExistsByPhone = await (dto.email
      ? this.usersService.findByEmail(dto.email)
      : this.usersService.findByUsername(dto.mobile));
    if (!!userExistsByPhone) {
      throw new BadRequestException('User already exists');
    }
    const hash = await HashHelper.hash(
      dto.password ? dto.password : dto.mobile
    );
    let user: User = new User();
    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    if (dto.mobile) user.mobile = dto.mobile;
    if (dto.email) user.email = dto.email;

    user.roles = [Role.Membership];
    user.status = UserStatus.enabled;
    user.password = hash;
    user.resetToken = Utils.generateToken();
    user.resetTime = new Date();
    if (dto.mobile) {
      await this.sendActivationToken({
        mobile: user.mobile,
        name: user?.firstName + ' ' + user?.lastName,
        token: user.resetToken,
        email: user.email
      });
    }
    await this.usersService.create(user);
    return true;
  }

  async signIn(data: AuthDto, ip: string) {
    const user = await (isEmail(data.username)
      ? this.usersService.findByEmail(data.username)
      : this.usersService.findByUsername(data.username));
    if (!user) throw new BadRequestException('User does not exist');
    if (!user.accessIpAddress || user.accessIpAddress !== ip) {
      const passwordMatches = await HashHelper.match(
        user.password,
        data.password
      );
      if (!passwordMatches)
        throw new BadRequestException('Invalid username or password');
    }
    if (user.status == UserStatus.disabled) {
      throw new BadRequestException('User is disabled');
    }
    if (user.status == UserStatus.lock) {
      throw new BadRequestException('User is locked');
    }
    let permissionsClaim = await this.getPermissionsArray(user);
    const tokens = await this.getTokens(user, permissionsClaim);
    await this.tokenStore.storeTokens(user.id, tokens);
    this.usersService.update(user.id, {
      lastLoggedIn: new Date()
    });
    user.permissions = await this.getPermissions(user);
    return {
      refreshToken: tokens[1],
      accessToken: tokens[0],
      user
    };
  }

  async checkAuthById(id: number) {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user?.status == UserStatus.disabled) {
      throw new BadRequestException('User is disabled');
    }
    if (user.status == UserStatus.lock) {
      throw new BadRequestException('User is locked');
    }
    let permissionsClaim = await this.getPermissionsArray(user);
    const tokens = await this.getTokens(user, permissionsClaim);
    await this.tokenStore.storeTokens(user.id, tokens);
    this.usersService.update(user.id, {
      lastLoggedIn: new Date()
    });
    user.permissions = await this.getPermissions(user);
    return {
      refreshToken: tokens[1],
      accessToken: tokens[0],
      user
    };
  }

  async resetPassword(username: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) throw new BadRequestException('User does not exist');
    if (user.status == UserStatus.lock) {
      throw new BadRequestException('User is locked');
    }
    if (user.resetNumberRequest > 3) {
      if (
        !user.resetTime ||
        new Date().getTime() - user.resetTime.getTime() < 3600
      ) {
        throw new BadRequestException('Too many request');
      }
      user.resetNumberRequest = 0;
    }
    user.resetToken = Utils.generateToken();
    user.resetTime = new Date();
    if (!user.resetNumberRequest) {
      user.resetNumberRequest = 1;
    } else {
      user.resetNumberRequest++;
    }
    console.log(user);
    await this.sendActivationToken({
      mobile: user.mobile,
      name: user?.firstName + ' ' + user?.lastName,
      token: user.resetToken,
      email: user.email
    });
    await this.usersService.update(user.id, {
      resetNumberRequest: user.resetNumberRequest,
      resetTime: user.resetTime,
      resetToken: user.resetToken
    });
    // return user.resetToken;
    return true
  }

  async verifyToken(dto: ActivationDto) {
    const user = await this.usersService.findByUsername(dto.username);
    if (!user) throw new BadRequestException('User does not exist');
    if (user.status == UserStatus.lock) {
      throw new BadRequestException('User is locked');
    }

    if (user.resetToken != dto.token) {
      throw new BadRequestException('Invalid activation token');
    }

    if (user.resetTime?.getTime() + 120000 < Date.now()) {
      throw new BadRequestException('Expired token');
    }
    user.resetToken = null;
    user.resetNumberRequest = 0;
    user.password = await HashHelper.hash(dto.token);
    let permissionsClaim = await this.getPermissionsArray(user);
    const tokens = await this.getTokens(user, permissionsClaim);
    await this.tokenStore.storeTokens(user.id, tokens);

    await this.usersService.update(user.id, {
      resetToken: user.resetToken,
      resetNumberRequest: user.resetNumberRequest,
      password: user.password,
      lastLoggedIn: new Date()
    });

    const permissions = await this.getPermissions(user);
    return {
      refreshToken: tokens[1],
      accessToken: tokens[0],
      user: { ...user, permissions }
    };
  }

  async refreshTokens(userId: number, refreshToken: string) {
    // if (await this.tokenStore.tryLock(`:lock:refresh_tokens:${userId}`, 10)) {
    let token = await this.tokenStore.getRefreshToken(userId);
    if (token != refreshToken)
      throw new ForbiddenException('Invalid RefreshToken');
    const user = await this.usersService.findOne(userId);
    if (!user) throw new ForbiddenException('Access Denied');

    let permissions = await this.getPermissionsArray(user);
    const tokens = await this.getTokens(user, permissions);
    await this.tokenStore.storeTokens(user.id, tokens);

    return {
      refreshToken: tokens[1],
      accessToken: tokens[0]
    };
    // } else {
    //   return {
    //     wait: 1000
    //   };
    // }
  }

  async logout(userId: number) {
    await this.tokenStore.deleteTokens(userId);
    return true;
  }

  async getTokens(user: User, permissions?: string[]) {
    return Promise.all([
      this.jwtService.signAsync(
        {
          email: user.email,
          sub: user.id,
          username: user.mobile,
          isLegal: user.isLegal,
          companyName: user?.companyName,
          roles: user.roles,
          groups: user?.groups?.map((g) => g.id),
          accessOrganizationUnits: user?.accessOrganizationUnits?.map(
            (o) => o.id
          ),
          accessFiscalYears: user?.accessFiscalYears?.map((f) => f.id),
          accessShops: user?.accessShops?.map((s) => s.id),
          accessBanks: user?.accessBanks?.map((s) => s.id),
          parent: user?.parentId,
          code: user.code,
          permissions
        },
        {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRED')
        }
      ),
      this.jwtService.signAsync(
        {
          sub: user.id,
          username: user.mobile
        },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRED')
        }
      )
    ]);
  }

  async getPermissions(user: User) {
    if (user?.groups?.length > 0) {
      let permissions = await this.usersService.getUserPermissions(user);
      let permissionOut = {};
      for (let permission of permissions) {
        let actions = permissionOut[permission.key];
        let set = new Set<string>([
          ...(actions || []),
          ...(permission.actions || [])
        ]);
        permissionOut[permission.key] = [...set];
      }
      return permissionOut;
    }
    return {};
  }

  async getPermissionsArray(user: User) {
    let permissionOut = new Set<string>(user.roles);
    if (permissionOut.has(Role.Admin)) {
      return [...permissionOut];
    }
    if (user?.groups?.length > 0) {
      let permissions = await this.usersService.getUserPermissions(user);
      for (let permission of permissions) {
        for (let action of permission.actions || []) {
          if (!permissionOut.has(permission.key)) {
            if (action == '*') {
              permissionOut.add(permission.key);
            } else {
              permissionOut.add(`${permission.key}_${action}`);
            }
          }
        }
      }
    }
    return [...permissionOut];
  }

  async sendActivationToken(params: {
    mobile?: string;
    name?: string;
    token: string;
    email?: string;
  }) {
    this.eventEmitter.emit(EventsConstant.SMS_NOTIFICATION, {
      mobile: params.mobile,
      email: params.email,
      templateName: NotificationMessageTemplate.OTP,
      tokens: { otp: params.token, name: params.name }
    } as NotificationTemplateDTO);
  }
}
