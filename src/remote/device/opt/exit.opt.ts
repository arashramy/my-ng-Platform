import { Inject, Injectable } from '@nestjs/common';
import { DeviceMessage } from '../device.constant';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';
import {
  DeviceOperationType,
  OperationNameDevice,
  createOperationDeviceEvent
} from '../device.util';
import { User } from '../../../base/entities/User';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { SaleOrder } from '../../../automation/operational/entities/SaleOrder';
import { ReceptionService } from '../../../automation/operational/service/reception.service';
import { AttendanceDevice } from '../../../base/entities/AttendanceDevice';
import { DeviceLogService } from '../device-log.service';
import { SaleOrderService } from '../../../automation/operational/service/sale-order.service';
import moment, { invalid } from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { SaleItem } from '../../../automation/operational/entities/SaleItem';

interface NoReceptionToExit {
  adapter: any;
  deviceConfigUrl: string;
  device: AttendanceDevice;
  user: User;
  identifyType: string;
}

interface HandleSettleReceptionNotification {
  adapter: any;
  deviceConfigUrl: string;
  deviceCode: string;
  user: User;
  saleUnit: SaleUnit;
  mustSettle: SaleOrder[];
}

interface ExitMultipleReception {
  saleOrders: SaleOrder[];
  adapter: any;
  deviceConfigUrl: string;
  deviceCode: string;
  user: User;
  device: AttendanceDevice;
}

@Injectable()
export class ExitDeviceOpt {
  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;

  @Inject(ReceptionService)
  private receptionService: ReceptionService;

  @Inject(DeviceLogService)
  private readonly deviceLogService: DeviceLogService;

  @Inject(SaleOrderService)
  private readonly saleOrderService: SaleOrderService;

  async noReceptionToExit({
    adapter,
    deviceConfigUrl,
    user,
    device,
    identifyType
  }: NoReceptionToExit) {
    this.eventEmitter.emit(
      EventsConstant.CLIENT_REMOTE,
      createOperationDeviceEvent(
        OperationNameDevice.NO_RECEPTION_EXIST,
        {
          user,
          id: this.generateId(),
          type: 'action'
        },
        DeviceOperationType.EXIT
      )
    );
    adapter.sendResult(deviceConfigUrl, {
      deviceCode: device.deviceCode,
      message: DeviceMessage.NO_RECEPTION_EXIST
    });
    this.deviceLogService.create({
      device,
      deviceMessage: DeviceMessage.NO_RECEPTION_EXIST,
      type: OperationNameDevice.EXIT,
      user,
      identifyType
    });
    return { message: DeviceMessage.NO_RECEPTION_EXIST } as any;
  }

  async handleSettleReceptionNotification({
    adapter,
    deviceCode,
    deviceConfigUrl,
    user,
    saleUnit,
    mustSettle
  }: HandleSettleReceptionNotification) {
    adapter.sendResult(deviceConfigUrl, {
      deviceCode,
      message: DeviceMessage.SETTLE_RECEPTION
    });
    this.eventEmitter.emit(
      EventsConstant.CLIENT_REMOTE,
      createOperationDeviceEvent(
        OperationNameDevice.SETTLE_AND_EXIT,
        {
          orders: mustSettle,
          user,
          saleUnit,
          id: this.generateId(),
          type: 'action'
        },
        DeviceOperationType.EXIT
      )
    );

    return { message: DeviceMessage.SETTLE_RECEPTION } as any;
  }

  async exitMultipleReception({
    saleOrders,
    adapter,
    deviceCode,
    deviceConfigUrl,
    user,
    device
  }: ExitMultipleReception) {
    for (let i = 0; i < saleOrders.length; i++) {
      const saleOrder = saleOrders[i];
      await this.receptionService.logout(
        { id: saleOrder.id } as any,
        undefined
      );
    }
    this.eventEmitter.emit(
      EventsConstant.CLIENT_REMOTE,
      createOperationDeviceEvent(
        OperationNameDevice.EXIT,
        {
          user,
          id: this.generateId(),
          type: 'news'
        },
        DeviceOperationType.EXIT
      )
    );
    adapter.sendResult(deviceConfigUrl, {
      deviceCode,
      message: DeviceMessage.DO_EXIT
    });

    if (device.hasGate) {
      adapter.openGate(deviceConfigUrl, { deviceCode });
      adapter.sendResult(deviceConfigUrl, {
        deviceCode,
        message: DeviceMessage.OPEN_GATE_SUCCESSFULL
      });

      return { message: DeviceMessage.OPEN_GATE_SUCCESSFULL } as any;
    }

    return { message: DeviceMessage.DO_EXIT } as any;
  }

  async validationUnFairPenalty(penalty_saleItems: SaleItem[]) {
    if (penalty_saleItems.length === 0) return;
    return !!penalty_saleItems.find((element) => {
      const diff_minutes = moment(
        moment().format(AppConstant.SUBMIT_TIME_FORMAT)
      ).diff(
        moment(
          moment(element.saleOrder.start).format(AppConstant.SUBMIT_TIME_FORMAT)
        ),
        'minutes'
      );

      const unfairUseTotalAmount =
        Math.floor(
          diff_minutes /
            ((+element.product.fairUseTime || 0) +
              (+element.product.fairUseLimitTime || 0))
        ) *
          (+element.product.unfairUseAmount || 0) -
        element.unFairPenaltyQuantity;
      return (
        element.registeredService &&
        element.registeredService.credit -
          element.registeredService.usedCredit <
          unfairUseTotalAmount
      );
    });
  }

  async validationUnFairSaleItems({
    saleOrders,
    adapter,
    deviceCode,
    deviceConfigUrl,
    user,
    device
  }: ExitMultipleReception) {
    let inValid = undefined;
    console.log('called validationUnFairSaleItems');
    for (let index = 0; index < saleOrders.length && !inValid; index++) {
      const element = saleOrders[index];

      const result = await this.saleOrderService.penaltyApply(
        element.id,
        undefined,
        true
      );
      console.log("resutl",result)
      if (result[1]) {
        inValid = result[0];
      }
    }
    return inValid
  }

  generateId() {
    return Math.floor(Math.random() * 1000000000000);
  }
}
