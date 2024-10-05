import { InjectQueue, OnGlobalQueueError, OnGlobalQueueFailed, OnQueueError, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { SaleItemDto, SaleOrderDto } from '../dto/sale-order.dto';
import { User } from '../../../base/entities/User';
import { BadRequestException, Inject } from '@nestjs/common';
import { SaleOrderService } from './sale-order.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';

@Processor('reserve-order')
export class ReserveServiceProcessor {
  @Inject(SaleOrderService) saleOrderService: SaleOrderService;
  @Inject(EventEmitter2) eventEmitter: EventEmitter2;

  constructor(
    @InjectQueue('reserve-secondary-order') public readonly queue: Queue
  ) {}



  @Process()
  async reserve({
    data
  }: Job<{ masterOrderPayload: SaleOrderDto; user: User; item: any }>) {
    try {
      const user = await User.findOne({
        where: { id: data.user.id },
        relations: {
          accessShops: true,
          accessBanks: true,
          accessFiscalYears: true,
          accessOrganizationUnits:true,
        }
      });

      return this.saleOrderService.submit(
        data.masterOrderPayload,
        user,
        async (order) => {
          this.eventEmitter.emit(EventsConstant.CLIENT_REMOTE, {
            data: { order: order.id },
            key: 'RESERVE'
          });
          if (data.item?.secondaryServices?.filter((e) => e).length > 0) {
            for (let j = 0; j < data.item.secondaryServices.length; j++) {
              const secondaryService = data.item.secondaryServices[j];
              this.queue.add({
                payload: {
                  user: secondaryService.user,
                  saleUnit: data.masterOrderPayload.saleUnit,
                  fiscalYear: data.masterOrderPayload.fiscalYear,
                  organizationUnit: data.masterOrderPayload.organizationUnit,
                  isReserve: true,
                  parentSubProductOrders: order.id,
                  transactions: secondaryService.transactions,
                  items: [
                    {
                      isReserve: true,
                      quantity: 1,
                      amount: secondaryService.price,
                      price: secondaryService.price,
                      reservedDate: data.item.reservedDate,
                      reservedStartTime: data.item.reservedStartTime,
                      reservedEndTime: data.item.reservedEndTime,
                      ...secondaryService
                    }
                  ]
                },
                user
              });
            }
          }
        }
      );
    } catch (error) {
      console.log('error', error);
    }
  }
}
