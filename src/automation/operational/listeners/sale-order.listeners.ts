import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';
import { SaleOrder } from '../entities/SaleOrder';
import {
  CrudAction,
  RemoteAction,
  RemoteCommand
} from '../../../common/sse/sse.service';
import { PermissionKey } from '../../../common/constant/auth.constant';
import {
  _concatName,
  _formatDate,
  _priceFormat
} from '../../../common/helper/formatter.helper';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CashBackService } from '../service/cash-back.service';
import { SaleItemDto, SaleOrderDto } from '../dto/sale-order.dto';
import { CreateCashBackDto } from '../dto/create-cash-back.dto';
import { SmsSaleOrderService } from '../../../sms/sms-sale-order.service';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';


@Injectable()
export class SaleOrderListeners {
  constructor(
    private eventEmitter: EventEmitter2,
    @InjectQueue('gift-package') private readonly giftPackageQueue: Queue,
    private readonly cashBackService: CashBackService,
    @Inject(SmsSaleOrderService)
    private readonly smsSaleOrderService: SmsSaleOrderService
  ) {}

  @OnEvent(EventsConstant.CASH_BACK_PROCESS)
  cashBackOrder(data: CreateCashBackDto) {
    this.cashBackService.createCashBack(data);
  }

  @OnEvent(EventsConstant.ORDER_SAVED_CHECK_GIFT_PACKAGE)
  async onSaveOrderAndCheckGiftWallet(order: SaleOrder) {
    this.giftPackageQueue.add('use-gift', { user: order?.user?.id });
  }

  @OnEvent(EventsConstant.ORDER_SAVE_LOG)
  saveOrderLog({ dto, id }: { dto: SaleOrderDto; id: number }) {
    //
    console.log('LOG');
  }

  //payload=>[old order,new order]
  @OnEvent(EventsConstant.ORDER_SAVE)
  async onSaveOrder(payload: [SaleOrder, SaleOrder, boolean]) {
    console.log('called event',payload && payload[0] && payload[1]);
    if (payload && payload[1]) {
      await this.sendRemoteAction(payload[1], payload[1].transactions);
    }
    console.log('sms notification', payload[1]?.id);
    if (!payload[2]) {
      await this.smsSaleOrderService.sendSms(payload?.[1]);
    }
  }

  @OnEvent(EventsConstant.ORDER_SETTLED)
  async onSettleOrder(payload: [SaleOrder, SaleOrder]) {
    if (payload?.length === 2) {
      await this.sendRemoteAction(payload[1], payload[1].transactions);
    }
  }

  @OnEvent(EventsConstant.ORDER_DELETE)
  async onDeleteOrder(payload: SaleOrder) {
    if (payload) {
      await this.sendRemoteAction(payload, payload.transactions);
    }
  }

  @OnEvent(EventsConstant.RECEPTION_LOGOUT)
  async onLogoutReception(payload: SaleOrder) {
    if (payload) {
      await this.sendRemoteAction(payload, payload.transactions);
    }
  }

  @OnEvent(EventsConstant.RECEPTION_LOGOUT_ALL)
  async onLogoutAllReception(payload: SaleOrder[]) {
    if (payload.length) {
      await this.sendRemoteAction({ reception: true } as SaleOrder, []);
    }
  }

  @OnEvent(EventsConstant.RECEPTION_BACK_TO_LOGIN)
  async onBackToLoginReception(payload: SaleOrder) {
    if (payload) {
      payload.items = [];
      await this.sendRemoteAction(payload, []);
    }
  }

  @OnEvent(EventsConstant.ORDER_DELETE_TRANSACTIONS)
  async onDeleteTransactionsOrder(payload: SaleOrder) {
    if (payload) {
      await this.sendRemoteAction(payload, payload.transactions);
    }
  }


  

  sendRemoteAction(order: SaleOrder, trxList: any[]) {
    console.log('21122121');
    return this.eventEmitter.emitAsync(EventsConstant.CLIENT_REMOTE, {
      data: {
        action: CrudAction.Refresh,
        data: {
          id: order.id,
          user: order?.user?.id || order.userId,
          [SaleUnitType.Service]: order?.items?.some(
            (i) => i.type == SaleUnitType.Service
          ),
          [SaleUnitType.Credit]: order?.items?.some(
            (i) => i.type == SaleUnitType.Credit
          ),
          [SaleUnitType.Package]: order?.items?.some(
            (i) => i.type == SaleUnitType.Package
          ),
          reception: order?.reception,
          transactions: !!trxList?.length,
          klassGroup: order?.items?.some(
            (i) => i.groupClassRoom?.id || i.groupClassRoomId
          )
        }
      },
      key: PermissionKey.AUTOMATION_OPT_ORDERS,
      action: RemoteAction.DataTable
    } as RemoteCommand);
  }
}
