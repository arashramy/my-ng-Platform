import { Injectable } from '@nestjs/common';
import { AttendanceDevice } from '../../base/entities/AttendanceDevice';
import { AttendanceDeviceLog } from '../../base/entities/AttendanceDeviceLog';
import { User } from '../../base/entities/User';

@Injectable()
export class DeviceLogService {
  async create(dto: {
    user: User;
    device: AttendanceDevice;
    description?: string;
    deviceMessage: string;
    type: string;
    identifyType?: string;
  }) {
    const deviceLog = new AttendanceDeviceLog();
    deviceLog.user = dto.user;
    deviceLog.device = dto.device;
    deviceLog.description = dto.description;
    deviceLog.deviceMessage = dto.deviceMessage;
    deviceLog.type = dto.type;
    deviceLog.identifyType = dto.identifyType;
    await deviceLog.save();
  }
}
