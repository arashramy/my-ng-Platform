import { Inject, Injectable } from '@nestjs/common';
import { LockerService as LockerItemService } from '../../../automation/base/service/locker.service';
import { LocalLockerManagerService } from '../../../remote/locker-manager/service/local-locker-manager.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';
import {
  DeviceOperationType,
  OperationNameDevice,
  createOperationDeviceEvent
} from '../device.util';
import { DeviceMessage } from '../device.constant';
import { User } from '../../../base/entities/User';
import { AttendanceDevice } from '../../../base/entities/AttendanceDevice';
import { ReceptionLocker } from '../../../automation/operational/entities/ReceptionLocker';
import { LockerItem } from '../../../automation/operational/entities/LockerItem';
import { In, IsNull } from 'typeorm';
import { SaleOrder } from '../../../automation/operational/entities/SaleOrder';

interface ValidateVipLockerAndOpen {
  user: User;
  device: AttendanceDevice;
  adapter: any;
  deviceConfigUrl: string;
}

interface NoLockerExist {
  adapter: any;
  deviceConfigUrl: string;
  user: User;
  deviceCode: string;
}

interface OpenSingleLocker {
  rcp: ReceptionLocker;
  adapter: any;
  device: AttendanceDevice;
  deviceConfigUrl: string;
  user: User;
}

interface SendNotificationOnMultipleLocker {
  adapter: any;
  deviceConfigUrl: string;
  reception: ReceptionLocker[];
  user: User;
  deviceCode: string;
}

@Injectable()
export class LockerDeviceOpt {
  @Inject(LockerItemService)
  private readonly lockerItemService: LockerItemService;

  @Inject(LocalLockerManagerService)
  private readonly lockerServiceManager: LocalLockerManagerService;

  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;

  // Help: Generate Id For Handling In Client
  generateId() {
    return Math.floor(Math.random() * 1000000000000);
  }

  // Help: Check the user locker vip and if it has vip locker , open it
  async validateVipLockerAndOpen({
    user,
    device,
    adapter,
    deviceConfigUrl
  }: ValidateVipLockerAndOpen) {
    const vipLocker = await this.lockerItemService.getUserVipLocker(
      user.id,
      device.saleUnit.id,
      new Date()
    );

    if (vipLocker) {
      const rcpLocker = await SaleOrder.findOne({
        where: {
          reception: true,
          vipLocker: { lockerNumber: vipLocker.lockerNumber },
          end: IsNull(),
          user: { id: user.id },
          deletedAt: IsNull(),
          deletedBy: IsNull()
        }
      });
      if (rcpLocker) {
        adapter.sendResult(deviceConfigUrl, {
          deviceCode: device.deviceCode,
          message: DeviceMessage.LOCKER_OPEN(vipLocker.lockerNumber)
        });
        this.lockerServiceManager.singleLockerManager([
          {
            id: vipLocker.lockerId,
            relayNumber: vipLocker.relayNumber + 1,
            state: 2
          }
        ]);
        this.eventEmitter.emit(
          EventsConstant.CLIENT_REMOTE,
          createOperationDeviceEvent(
            OperationNameDevice.OPEN_LOCKER,
            {
              user: user,
              locker: vipLocker.lockerNumber,
              id: this.generateId(),
              type: 'news',
              attendanceDeviceInfo: device
            },
            DeviceOperationType.LOCKER
          )
        );
        return {
          vipLocker,
          message: DeviceMessage.LOCKER_OPEN(vipLocker.lockerNumber)
        } as any;
        //return true;
      }
    }

    return false;
  }

  // Help: send notification to client and device if it want to open locker but dont have any locker
  async noLockerExist({
    adapter,
    deviceConfigUrl,
    user,
    deviceCode
  }: NoLockerExist) {
    adapter.sendResult(deviceConfigUrl, {
      deviceCode: deviceCode,
      message: DeviceMessage.NO_LOCKER_EXIST
    });
    console.log('NO_LOCKER_DEVICE');
    this.eventEmitter.emit(
      EventsConstant.CLIENT_REMOTE,
      createOperationDeviceEvent(
        OperationNameDevice.NO_LOCKER,
        {
          user: user,
          id: this.generateId(),
          type: 'error'
        },
        DeviceOperationType.LOCKER
      )
    );
    return { message: DeviceMessage.NO_LOCKER_EXIST } as any;
  }

  // Help: Open Single Locker if user want to open it
  async openSingleLocker({
    adapter,
    device,
    deviceConfigUrl,
    rcp,
    user
  }: OpenSingleLocker) {
    console.log('SINGLE_LOCKER_DEVICE');
    adapter.sendResult(deviceConfigUrl, {
      device: device,
      deviceCode: device.deviceCode,
      message: DeviceMessage.LOCKER_OPEN(rcp.locker)
    });
    const locker = await LockerItem.findOne({
      where: { 
        lockerNumber: rcp.locker,
        // locker: { saleUnit: { id: device.saleUnitId } } //! remove saleunit from location
      },
      // relations: ['locker.saleUnit']
    });

    console.log(1111, locker);

    this.lockerServiceManager.singleLockerManager([
      {
        id: locker.lockerId,
        relayNumber: locker.relayNumber + 1,
        state: 2
      }
    ]);
    this.eventEmitter.emit(
      EventsConstant.CLIENT_REMOTE,
      createOperationDeviceEvent(
        OperationNameDevice.OPEN_LOCKER,
        {
          user,
          locker: rcp?.locker,
          id: this.generateId(),
          type: 'news',
          attendanceDeviceInfo: device
        },
        DeviceOperationType.LOCKER
      )
    );

    return {
      locker,
      message: DeviceMessage.LOCKER_OPEN(rcp.locker)
    } as any;
  }

  // Help: What happen if user has multiple locker assigned to it?
  // send notification to select lcoker
  async sendNotificationOnMultipleLocker({
    adapter,
    deviceConfigUrl,
    reception,
    user,
    deviceCode
  }: SendNotificationOnMultipleLocker) {
    console.log('MULTIPLE_LOCKER_DEVICE');
    adapter.sendResult(deviceConfigUrl, {
      deviceCode,
      message: DeviceMessage.SELECT_YOUR_LOCKER
    });
    const lockers = await LockerItem.find({
      where: { lockerNumber: In(reception.map((e) => e.locker)) },
      relations: { locker: true }
    });
    this.eventEmitter.emit(
      EventsConstant.CLIENT_REMOTE,
      createOperationDeviceEvent(
        OperationNameDevice.MULTIPLE_LOCKER,
        {
          type: 'action',
          id: this.generateId(),
          user: user,
          lockers: lockers.map((locker) => ({
            ...locker,
            detail: reception.find((rcp) => rcp.locker === locker.lockerNumber)
          }))
        },
        DeviceOperationType.LOCKER
      )
    );

    return { message: DeviceMessage.SELECT_YOUR_LOCKER } as any;
  }
}
