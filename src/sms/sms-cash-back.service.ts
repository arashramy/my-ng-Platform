import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../common/constant/events.constant';
import { _priceFormat } from '../common/helper/formatter.helper';
import {
  NotificationTemplateDTO,
  NotificationMessageTemplate
} from '../notification/NotificationService';
import JalaliMoment from 'moment-jalaali';
import { SaleItem } from '../automation/operational/entities/SaleItem';

@Injectable()
export class SmsCashBackService {
  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;

  async sendCashBackSms(items: SaleItem[], serviceName: string) {
    console.log('sns cashbacke');
    await items?.map(async (item) => {
      const smsTemplate: NotificationTemplateDTO = {
        templateName: NotificationMessageTemplate.CashBackTemplate,
        mobile: item.user.mobile,
        email: item.user.email,
        tokens: {
          customer_name: item.user.firstName.concat(' ', item.user.lastName),
          service_name: serviceName,
          price: _priceFormat(item?.price, 'fa'),
          expired_date: JalaliMoment(item.end).format('jYYYY/jMM/jDD')
        }
      };
      console.log(smsTemplate);
      await this.eventEmitter.emitAsync(
        EventsConstant.SMS_NOTIFICATION,
        smsTemplate
      );
    });
  }
}
