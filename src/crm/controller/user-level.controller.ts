import { Not } from 'typeorm';
import {PermissionAction, PermissionKey} from '../../common/constant/auth.constant';
import { BaseController } from '../../common/controller/base.controller';
import { UserLevel } from '../entities/UserLevel';
import { Controller } from '@nestjs/common';
import { User } from '../../base/entities/User';

@Controller('/api/user-level')
export class UserLevelController extends BaseController<UserLevel> {
  constructor() {
    super(UserLevel, PermissionKey.CRM_BASE_CUSTOMER_GROUP);
  }

  async postCreate(model: UserLevel, current: User): Promise<UserLevel> {
    const result = await super.postCreate(model, current);
    if (result.asDefault) {
      await UserLevel.update({ id: Not(result.id) }, { asDefault: false });
    }
    return result;
  }

  async postEdit(
    model: UserLevel,
    entity: UserLevel,
    current: User
  ): Promise<UserLevel> {
    const result = await super.postEdit(model, entity, current);
    if (result.asDefault) {
      await UserLevel.update({ id: Not(result.id) }, { asDefault: false });
    }
    return result;
  }

  additionalPermissions(): string[] {
    return [`${PermissionKey.AUTOMATION_OPT_MEMBERSHIP}_${PermissionAction.CREATE}`];
  }
}
