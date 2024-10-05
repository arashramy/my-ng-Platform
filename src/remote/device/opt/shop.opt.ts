import { Inject, Injectable } from '@nestjs/common';
import { AttendanceDevice } from '../../../base/entities/AttendanceDevice';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DeviceOperationType,
  OperationNameDevice,
  createOperationDeviceEvent
} from '../device.util';
import { User } from '../../../base/entities/User';
import { EventsConstant } from '../../../common/constant/events.constant';
import { DeviceMessage } from '../device.constant';
import { DeviceLogService } from '../device-log.service';
import {
  SaleUnitType
} from '../../../automation/operational/entities/SaleItem';

export interface HandleShopRequest {
  device: AttendanceDevice;
  user: User;
  adapterService: any;
  deviceConfigUrl: string;
  identifyType: string;
}

@Injectable()
export class ShopDeviceOpt {
  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;

  @Inject(DeviceLogService)
  private readonly deviceLogService: DeviceLogService;

  generateId() {
    return Math.floor(Math.random() * 1000000000000);
  }

  async handleShopRequest({
    device,
    user,
    adapterService,
    deviceConfigUrl,
    identifyType
  }: HandleShopRequest) {
    if (!device.saleUnit.types.includes(SaleUnitType.Product)) {
      adapterService.sendResult(deviceConfigUrl, {
        deviceCode: device.deviceCode,
        message: DeviceMessage.SHOP_OPEN_FAILED_ACCESS
      });
      this.deviceLogService.create({
        user,
        device,
        deviceMessage: DeviceMessage.NOT_SUPPORTED_SHOP_DEVICE,
        description: DeviceMessage.NOT_SUPPORTED_SHOP_DEVICE,
        type: DeviceOperationType.SHOP,
        identifyType
      });

      return { message: DeviceMessage.SHOP_OPEN_FAILED_ACCESS } as any;
    }

    this.eventEmitter.emit(
      EventsConstant.CLIENT_REMOTE,
      createOperationDeviceEvent(
        OperationNameDevice.SELECT_PRODUCT_SHOP,
        {
          user,
          device,
          saleUnit: device.saleUnit,
          id: this.generateId(),
          type: 'action'
        },
        DeviceOperationType.SHOP
      )
    );

    adapterService.sendResult(deviceConfigUrl, {
      deviceCode: device.deviceCode,
      message: DeviceMessage.OPEN_SHOP_SUCCESSFULLY
    });

    this.deviceLogService.create({
      user,
      device,
      deviceMessage: DeviceMessage.SHOP_DEVICE_OPENED_SUCCESSFULLY,
      description: DeviceMessage.SHOP_DEVICE_OPENED_SUCCESSFULLY,
      type: DeviceOperationType.SHOP,
      identifyType
    });

    return { message: DeviceMessage.OPEN_SHOP_SUCCESSFULLY } as any;
  }
}
