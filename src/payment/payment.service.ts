import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { SaleOrderService } from '../automation/operational/service/sale-order.service';
import { Payment } from './entities/payment.entity';
import { SaleOrderDto } from '../automation/operational/dto/sale-order.dto';
import { User } from '../base/entities/User';
import { SaleUnit } from '../base/entities/SaleUnit';
import { TransactionSourceType } from '../base/entities/TransactionSource';
import moment from 'moment';
import { AppConstant } from '../common/constant/app.constant';

@Injectable()
export class PaymentService {
  constructor(
    private http: HttpService,
    private saleOrderService: SaleOrderService
  ) {}
  async submitOrderOnlineShop(
    payment: Payment,
    order: SaleOrderDto[],
    current: User,
    errors?: string[]
  ) {
    console.log('-----------------submitOrderOnlineShop----------------');
    const saleUnit = await SaleUnit.findOne({
      where: { isOnline: true, allowSettle: true }
    });
    const orders = [];
    console.log('saleunit title', saleUnit?.title);

    if (!saleUnit) {
      console.log('called errorrr');
      errors.push('واخد فروش انلاین یافت نشد لظفا با پشتیبانی تماس بگیرید');
      return [[],errors]
    }

    for (let i = 0; i < order.length; i++) {
      try {
        order[i].submitAt=moment().format(AppConstant.SUBMIT_TIME_FORMAT)
        const element = order[i];
        console.log(element.submitAt,moment().format(AppConstant.SUBMIT_TIME_FORMAT))
        element.saleUnit = saleUnit?.id;
        order[i].items = order[i].items.map((el) => {
          const diff = moment(el.end).diff(el.start, 'days');
          el.start = order[i].submitAt;
          el.end = moment(order[i].submitAt)
            .add(diff, 'days')
            .format(AppConstant.DATE_FORMAT);
          return el;
        });
        element.payment = payment.id;
        console.log('element.payment',element.payment)
        element.transactions = [
          {
            submitAt: element.submitAt,
            source: payment?.gateway?.bank?.id as any,
            type: TransactionSourceType.Bank,
            amount: element.items
              ?.filter(
                (item: any) => !item.deletedAt && !item.parentId && !item.parent
              )
              ?.map((item) => {
                let total =
                  (item.price || 0) * (item.quantity || 0) -
                  (item.discount || 0);
                const taxAmount = (total * (item?.tax || 0)) / 100;
                const totalAmount = total + taxAmount;
                console.log('dataaa', taxAmount, total, totalAmount);
                return totalAmount;
              })
              .reduce((a, b) => (a || 0) + (b || 0), 0),
            user: element.user || 1
          }
        ];
        const orderId = await this.saleOrderService.submit(element, current);
        orders.push(orderId);
      } catch (error) {
        console.log(error)
        errors.push(error.message);
        payment.errors=errors.join(',')
        await payment.save()
      }
    }

    return [orders, errors];
  }

  async submitOrder(
    payment: Payment,
    order: SaleOrderDto[],
    current: User,
    errors?: string[]
  ) {
    const orders = [];
    for (let i = 0; i < order.length; i++) {
      try {
        const element = order[i];
        order[i].items = order[i].items.map((el) => {
          const diff = moment(el.end).diff(el.start, 'days');
          el.start = order[i].submitAt;
          el.end = moment(order[i].submitAt)
            .add(diff, 'days')
            .format(AppConstant.DATE_FORMAT);
          return el;
        });
        element.payment = payment.id;
        element.transactions = [
          {
            submitAt: element.submitAt,
            source: payment?.gateway?.bank?.id as any,
            type: TransactionSourceType.Bank,
            amount: element.items
              ?.filter(
                (item: any) => !item.deletedAt && !item.parentId && !item.parent
              )
              ?.map((item) => {
                let total =
                  (item.price || 0) * (item.quantity || 0) -
                  (item.discount || 0);
                const taxAmount = (total * (item?.tax || 0)) / 100;
                const totalAmount = total + taxAmount;
                return totalAmount;
              })
              .reduce((a, b) => (a || 0) + (b || 0), 0),
            user: element.user || 1
          }
        ];
        const orderId = await this.saleOrderService.submit(element, current);
        orders.push(orderId);
      } catch (error) {
        errors.push(error.message);
        payment.errors=errors.join(',')
        await payment.save()
      }
    }

    return [orders, errors];
  }
}