import { HttpService } from '@nestjs/axios';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role, User } from '../../base/entities/User';
import { DataSource } from 'typeorm';
import { CheckPlan, limitaionType } from './check.plan';

@Injectable()
export class AccessLimitGuard implements CanActivate {
  @Inject(HttpService)
  http: HttpService;

  @Inject(CheckPlan)
  checkPlan: CheckPlan;

  constructor(
    private x: Reflector,
    @Inject(DataSource) private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext) {
    let result = true;
    let data;
    const request = context.switchToHttp().getRequest() as Request;
    const properties = this.x.get('planLimitation', context.getHandler());

    if (!properties) {
      return true;
    }
    if (properties[0] === limitaionType.ROLE) {
      if (request.body.user.roles.includes(Role.User)) {
        result = await this.checkPlan.getCountUser();
      } else if (request.body.user.roles.includes(Role.Membership)) {
        result = await this.checkPlan.getCountMembers();
      }
    }

    if (properties[0] === limitaionType.SHOP_COUNT) {
      result = await this.checkPlan.getCountShops();
    }
    return result;
  }
}
