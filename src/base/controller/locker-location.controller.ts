import { Controller } from '@nestjs/common';
import { BaseController } from '../../common/controller/base.controller';
import { LockerLocation } from '../../automation/base/entities/LockerLocation';
import { PermissionKey } from '../../common/constant/auth.constant';

@Controller('/api/locker-location')
export class LockerLocationController extends BaseController<LockerLocation> {
  constructor() {
    super(LockerLocation, PermissionKey.AUTOMATION_BASE_LOCKER_LOCATION);
  }

  additionalPermissions(): string[] {
    return [];
  }
}
