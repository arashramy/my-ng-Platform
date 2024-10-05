import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from '../base/entities/User';
import { SaleItem } from '../automation/operational/entities/SaleItem';
import { EventsConstant } from '../common/constant/events.constant';
import JalaliMoment from 'moment-jalaali';
import {
  NotificationMessageTemplate,
  NotificationTemplateDTO
} from '../notification/NotificationService';
import { _priceFormat } from '../common/helper/formatter.helper';

interface SmsCancelReserveDTO {
  user: User;
  item: SaleItem;
  penaltyAmount: number;
}

@Injectable()
export class SmsReserveService {
  @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2;

  sendCancelReserve({ user, item, penaltyAmount }: SmsCancelReserveDTO) {
    const smsTemplate: NotificationTemplateDTO = {
      templateName: NotificationMessageTemplate.CancelReserveTemplate,
      mobile: user.mobile,
      tokens: {
        customer_name: user.firstName.concat(' ', user.lastName),
        name: item.product.title,
        id: item.id,
        reserve_at: JalaliMoment(item.reservedDate).format('jYYYY/jMM/jDD'),
        start_at: item.reservedStartTime,
        end_at: item.reservedEndTime,
        price: _priceFormat(penaltyAmount, 'fa')
      }
    };
    this.eventEmitter.emit(EventsConstant.SMS_NOTIFICATION, smsTemplate);
  }
}
