import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';
import { LocalLockerManagerService } from '../../../remote/locker-manager/service/local-locker-manager.service';

@Injectable()
export class LockerAssignListeners {
  constructor(
    private readonly lockerServiceManager: LocalLockerManagerService
  ) {}

  @OnEvent(EventsConstant.LOCKER_ASSIGNED_DEVICE)
  openLockersServiceDevice(data: any) {
    console.log('called openLockersServiceDevice', data);
    this.lockerServiceManager.singleLockerManager(data);
  }
}
