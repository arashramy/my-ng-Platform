import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { SaleOrderDto } from '../../../automation/operational/dto/sale-order.dto';
import { SaleOrder } from '../../../automation/operational/entities/SaleOrder';

@Injectable()
export class ShopReportOrderService {
  constructor(@InjectQueue('shop-report') private readonly shopReport: Queue) {}

  submit(order: SaleOrder, dto: SaleOrderDto) {
    this.shopReport.add({
      ...dto,
      submitAt: order.submitAt,
      items: order.items,
      id: order.id,
      shiftWork: order.shiftWork?.id
    });
  }

  delete(id: number) {
    this.shopReport.add('delete', { id });
  }
}
