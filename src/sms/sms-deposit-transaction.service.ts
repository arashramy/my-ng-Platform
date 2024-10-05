import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Transaction } from '../automation/operational/entities/Transaction';
import { EventsConstant } from '../common/constant/events.constant';
import { _priceFormat } from '../common/helper/formatter.helper';
import {
  NotificationMessageTemplate,
  NotificationTemplateDTO
} from '../notification/NotificationService';
import JalaliMoment from 'moment-jalaali';
import { User } from '../base/entities/User';

@Injectable()
export class SmsDepositTransactionService {
  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;

  async sendSms(transactions: Transaction[]) {
    transactions.map(async (result) => {
      if (typeof result !== 'object') return;
      let user = result.user;
      if (!user.firstName) {
        user = await User.findOne({ where: { id: result.user.id } });
      }
      const smsTemplate: NotificationTemplateDTO = {
        templateName: NotificationMessageTemplate.DepositTemplate,
        mobile: user.mobile,
        email: user.email,
        tokens: {
          customer_name: user.firstName.concat(' ', user.lastName),
          date: JalaliMoment(result.submitAt).format('jYYYY/jMM/jDD HH:mm'),
          id: user.code,
          increase_wallet: _priceFormat(result.amount, 'fa'),
          remain_amount: _priceFormat(result.credit, 'fa')
        }
      };
      await this.eventEmitter.emitAsync(
        EventsConstant.SMS_NOTIFICATION,
        smsTemplate
      );
    });
  }
}
