import { BaseController } from '../../../common/controller/base.controller';
import { ReserveTag } from '../entities/ReserveTag';
import { PermissionKey } from '../../../common/constant/auth.constant';
import { Controller } from '@nestjs/common';

@Controller('/api/reservation-tag')
export class ReserveTagController extends BaseController<ReserveTag> {
  constructor() {
    super(ReserveTag, PermissionKey.AUTOMATION_RESERVE_TAG);
  }

  additionalPermissions(): string[] {
    return [];
  }
}
