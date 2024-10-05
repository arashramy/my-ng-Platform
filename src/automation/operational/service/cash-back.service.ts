import { Inject, Injectable } from '@nestjs/common';
import { SaleOrderService } from './sale-order.service';
import { CreateCashBackDto } from '../dto/create-cash-back.dto';
import { ProductPrice } from '../../../automation/base/entities/ProductPrice';
import moment from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { Product,  } from '../../../automation/base/entities/Product';
import { In } from 'typeorm';
import { CashBackServiceGeneratorService } from './cash-back-service-generator.service';
import {
  NotificationMessageTemplate,
  NotificationTemplateDTO
} from '../../../notification/NotificationService';
import { EventsConstant } from '../../../common/constant/events.constant';
import { EventEmitter2 } from '@nestjs/event-emitter';
import JalaliMoment from 'moment-jalaali';
import { _priceFormat } from '../../../common/helper/formatter.helper';
import { SmsCashBackService } from '../../../sms/sms-cash-back.service';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';

@Injectable()
export class CashBackService {
  @Inject(SaleOrderService)
  private readonly service: SaleOrderService;

  @Inject(CashBackServiceGeneratorService)
  private readonly cashBackServiceGenerator: CashBackServiceGeneratorService;

  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;

  @Inject(SmsCashBackService)
  private readonly smsCashBackService: SmsCashBackService;

  async createCashBack({
    items,
    settleAmount,
    totalAmount,
    submitAt,
    userId,
    orgUnitId,
    saleUnitId,
    current,
    fiscalYearId,
    cashBackParent
  }: CreateCashBackDto) {
    console.log('callled createCashBack',settleAmount,totalAmount);
    // if (settleAmount !== totalAmount) {
    //   // console.log('order must be settle to use as cash back');
    //   return;
    // }


    const cashedBackProductItems = await Product.find({
      where: {
        id: In(
          items.filter((item) => !item.isTransfer).map((item) => item.product)
        ),
        isCashBack: true
      }
    });
    console.log(2,items.map((e)=>e.product))


    if (cashedBackProductItems.length === 0) { //no one contain cash back
      // console.log('no one contain cash back');
      return;
    }
    console.log(3)

    const cashedBackItems = items.filter((e)=>cashedBackProductItems.map((el)=>el.id).includes(e.product)).map((item) => ({
      ...item,
      product: cashedBackProductItems.find((product) => {
        return product.id === item.product;
      })
    }));
    console.log(4)

    const cashedBackWithItems = (
      await ProductPrice.find({
        where: cashedBackItems.map((item) => ({
          id: item.priceId,
          price: item.amount,
          duration: item.duration
        }))
      })
    ).map((productPrice) => ({
      cashBackMetadata: productPrice,
      item: cashedBackItems.find((item) => item.priceId === productPrice.id)
    }));

    let product = await Product.findOne({ where: { isGiftGenerator: true } });

    if (!product) {
      product = await this.cashBackServiceGenerator.createService();
    }

    const cashedBackPayload = cashedBackWithItems?.map((cashedBackItem) => ({
      beforeCashBackProduct: cashedBackItem?.item?.product,
      freeReception: true,
      organizationUnit: orgUnitId,
      saleUnit: saleUnitId,
      fiscalYear: fiscalYearId,
      cashBackParent: cashBackParent,
      submitAt: moment(submitAt, 'YYYY/MM/DD').format(
        AppConstant.DATETIME_FORMAT
      ),
      user: userId,
      lockers: [],
      lockerQuantity: 0,
      items: [
        {
          isCashBack: true,
          product: product.id,
          duration: cashedBackItem.cashBackMetadata.duration,
          quantity: 1,
          discount: 0,
          price:
            (cashedBackItem.cashBackMetadata.price *
              cashedBackItem.cashBackMetadata.cashBackPercentage) /
            100,
          tax: 0,
          amount:
            (cashedBackItem.cashBackMetadata.price *
              cashedBackItem.cashBackMetadata.cashBackPercentage) /
            100,
          manualPrice: false,
          type: SaleUnitType.Credit,
          registeredService: 0,
          start: moment(cashedBackItem.item?.start).format(
            AppConstant.DATE_FORMAT
          ),
          end: moment(cashedBackItem.item?.start)
            .add(cashedBackItem.cashBackMetadata.cashBackDuration, 'day')
            .format(AppConstant.DATE_FORMAT)
        }
      ]
    }));
    console.log("cashedBackPayload",cashedBackPayload.length)
    await Promise.all(
      cashedBackPayload.map((cashedBack) =>
        this.service.submit(
          cashedBack,
          current,
          async (order) => {
            await this.smsCashBackService.sendCashBackSms(
              order?.items,
              cashedBack?.beforeCashBackProduct?.title
            );

            order.settleAmount = order.totalAmount;
            return order
          },
          false
        )
      )
    );
  }
}
