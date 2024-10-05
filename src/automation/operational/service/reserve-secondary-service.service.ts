import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { SaleItemDto, SaleOrderDto } from '../dto/sale-order.dto';
import { User } from '../../../base/entities/User';
import { Inject, Injectable } from '@nestjs/common';
import { SaleOrderService } from './sale-order.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
@Processor('reserve-secondary-order')
export class ReserveSecondaryServiceServiceProcessor {
  @Inject(SaleOrderService) saleOrderService: SaleOrderService;
  @Inject(EventEmitter2) eventEmitter: EventEmitter2;

  @Process()
  async reserve({ data }: Job<{ payload: SaleOrderDto; user: User }>) {
    try {
      const user = await User.findOne({
        where: { id: data.user.id },
        relations: {
          accessShops: true,
          accessBanks: true,
          accessFiscalYears: true,
          accessOrganizationUnits: true
        }
      });
      await this.saleOrderService.submit(data.payload, user, (order) => {});
    } catch (error) {
      console.log(123, error);
    }
  }
}
