import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DeviceType } from '../../../base/entities/AttendanceDevice';

@Injectable()
export class AdapterService {
  constructor(private readonly moduleRef: ModuleRef) {}

  getAdapter(deviceType: DeviceType) {
    let type = '';
    switch (deviceType) {
      case DeviceType.Paliz:
        type = 'PALIZ';
        break;
      case DeviceType.Virdi:
        type = 'VIRDI';
        break;
    }
    return this.moduleRef.get(`PROVIDER_${type}`);
  }
}
