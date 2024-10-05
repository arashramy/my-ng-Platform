import { BaseController } from '../../common/controller/base.controller';
import { UserDescription } from '../entities/UserDescription';
import { Controller } from '@nestjs/common';
import { PermissionKey } from '../../common/constant/auth.constant';

@Controller('/api/user-description')
export class UserDescriptionController extends BaseController<UserDescription> {
  constructor() {
    super(UserDescription, PermissionKey.BASE_USERS);
  }

  additionalPermissions(): string[] {
    return [];
  }
}
