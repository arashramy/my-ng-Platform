import { BaseController } from '../../common/controller/base.controller';
import { Gateway } from '../entities/Gateway';
import { PermissionKey } from '../../common/constant/auth.constant';
import { Controller } from '@nestjs/common';
import { Role } from '../entities/User';

@Controller('/api/gateway')
export class GatewayController extends BaseController<Gateway> {
  constructor() {
    super(Gateway, PermissionKey.BASE_GATEWAY);
  }

  additionalPermissions(): string[] {
    return [Role.User, Role.Membership];
  }
}
