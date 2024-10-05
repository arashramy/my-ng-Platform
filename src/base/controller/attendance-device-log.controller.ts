import { Controller } from '@nestjs/common';
import { BaseController } from '../../common/controller/base.controller';
import { AttendanceDeviceLog } from '../entities/AttendanceDeviceLog';
import { PermissionKey } from '../../common/constant/auth.constant';

@Controller('/api/attendance-device-log')
export class AttendanceDeviceLogController extends BaseController<AttendanceDeviceLog> {
  constructor() {
    super(AttendanceDeviceLog, PermissionKey.BASE_ATTENDANCE_DEVICE_LOG);
  }

  additionalPermissions(): string[] {
    return [];
  }
}
