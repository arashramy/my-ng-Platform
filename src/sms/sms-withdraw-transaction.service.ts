import { SaleItem } from '../automation/operational/entities/SaleItem';
import { Transaction } from '../automation/operational/entities/Transaction';
import { TransactionSourceType } from '../base/entities/TransactionSource';
import { User } from '../base/entities/User';
import { EventsConstant } from '../common/constant/events.constant';
import { _concatName, _priceFormat } from '../common/helper/formatter.helper';
import {
  NotificationTemplateDTO,
  NotificationMessageTemplate
} from '../notification/NotificationService';
import JalaliMoment from 'moment-jalaali';
import { Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export class SmsWithDrawTransactionService {
  @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2;

  withdrawSms(transactions: Transaction | Transaction[]) {
    console.log('----------------withdraw-sms-----------------');
    let results: Transaction[] = Array.isArray(transactions)
      ? [...(transactions as Transaction[])]
      : [{ ...transactions } as Transaction];

    if (!Array.isArray(results)) results = [results];
    results.map(async (result) => {
      const user = await User.findOne({ where: { id: result.user.id } });
      let smsTemplate: NotificationTemplateDTO;

      if (result.sourceType === TransactionSourceType.ChargingService) {
        const saleItem = await SaleItem.findOne({
          where: { id: result.source },
          relations: { product: true, registeredService: true }
        });
        // const remainAmount =
        //   saleItem.credit - saleItem.usedCredit - result.order.settleAmount;
        const remainAmount = saleItem.credit - saleItem.usedCredit;

        smsTemplate = {
          mobile: user.mobile,
          email: user.email,
          tokens: {
            customer_name: _concatName(user.firstName, user.lastName),
            service_name: saleItem.product.title,
            expired_date: JalaliMoment(saleItem.end || new Date()).format(
              'jYYYY/jMM/jDD'
            ),
            price: _priceFormat(result.order.settleAmount, 'fa'),
            date: JalaliMoment(new Date()).format('jYYYY/jMM/jDD'),
            remain_amount:
              remainAmount < 0 ? 0 : _priceFormat(remainAmount, 'fa')
          },
          templateName: NotificationMessageTemplate.UseServiceChargeTemplate
        };
      } else {
        if (
          result.sourceType === TransactionSourceType.Bank ||
          result.sourceType === TransactionSourceType.CashDesk
        ) {
          return;
        }
        smsTemplate = {
          templateName: NotificationMessageTemplate.WithdrawWalletTemplate,
          mobile: user.mobile,
          email: user.email,
          tokens: {
            customer_name: user.firstName.concat(' ', user.lastName),
            created_at: JalaliMoment(result.submitAt).format(
              'jYYYY/jMM/jDD HH:mm'
            ),
            id: user.code,
            decrease_wallet: _priceFormat(result.amount, 'fa'),
            remain_amount: _priceFormat(result.credit, 'fa')
          }
        } as any;
      }
      console.log('one', smsTemplate);
      await this.eventEmitter.emitAsync(
        EventsConstant.SMS_NOTIFICATION,
        smsTemplate
      );
    });
  }
}
