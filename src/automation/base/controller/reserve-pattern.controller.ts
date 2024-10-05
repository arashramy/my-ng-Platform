import { BaseController } from '../../../common/controller/base.controller';
import { ReservePattern } from '../entities/ReservePattern';
import { PermissionKey } from '../../../common/constant/auth.constant';
import { Controller } from '@nestjs/common';
import { User } from '../../../base/entities/User';

@Controller('/api/reservation-pattern')
export class ReservePatternController extends BaseController<ReservePattern> {
  constructor() {
    super(ReservePattern, PermissionKey.AUTOMATION_RESERVE_PATTERN);
  }

  async prepareCreate(
    model: ReservePattern,
    current: User
  ): Promise<ReservePattern> {
    const entity = await super.prepareCreate(model, current);
    console.log(entity);
    return entity;
  }

  additionalPermissions(): string[] {
    return [];
  }
}
