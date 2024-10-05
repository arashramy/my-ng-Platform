import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import {firstValueFrom, map, Observable} from 'rxjs';
import { ResolveHelper } from '../../common/helper/resolver-data.helper';
import { Role, User } from '../../base/entities/User';
import { DataSource } from 'typeorm';
import { MonthExpiredException } from '../exceptions/month-expired.exception';

export enum limitaionType {
  SHOP_COUNT = 'shop_count',
  ROLE = 'ROLE',
}

class UserHttp {
  @Inject(HttpService)
  http: HttpService;

  @Inject(ConfigService)
  configService: ConfigService;

  @Inject(ResolveHelper)
  resolveHelper: ResolveHelper;

  // resolveResponse(api: Observable<AxiosResponse<any, any>>) {
  //   return new Promise((resolve, reject) => {
  //     try {
  //       api.subscribe((response) => {
  //         resolve(response.data);
  //       });
  //     } catch (error) {
  //       reject(error);
  //     }
  //   });
  // }

  callUserApi() {
    return firstValueFrom(this.http.get(this.configService.get<string>('ADMIN_URL'), {
      headers: {
        authorization: `Bearer ${this.configService.get<string>(
            'ADMIN_TOKEN',
        )}`,
      },
    }));
  }
}

@Injectable()
export class CheckPlan extends UserHttp {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {
    super();
  }

  @Inject(HttpService)
  http: HttpService;

  async checkExpire() {
    const data: any = await this.callUserApi();

    if (data.planMonth > 0) {
      throw new MonthExpiredException();
    }
    return true;
  }

  async getCountUser() {
    const data: any = await this.callUserApi();


    const usersLength = await User.createQueryBuilder('_users')
      .where('_users._roles like :roles', {
        roles: `%${Role.User}%`,
      })
      .getCount();
    if (data?.planUserCount <= usersLength && data?.planUserCount >= 0)
      return false;
    return true;
  }

  async getCountMembers() {
    const data: any = await this.callUserApi();
    const memberLength = await User.createQueryBuilder('_users')
      .where('_users._roles like :roles', {
        roles: `%${Role.Membership}%`,
      })
      .getCount();

    if (data?.planMemberCount <= memberLength && data?.planMemberCount >= 0)
      return false;
    return true;
  }

  async getCountShops() {
    const data: any = await this.callUserApi();
    const shopsLength = await this.dataSource.getRepository('Shop').count();
    if (data?.planShopCount <= shopsLength && data?.planShopCount >= 0)
      return false;
    return true;
  }
}
