import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';
import { Transaction } from '../entities/Transaction';
import {
  _formatDate,
  _priceFormat
} from '../../../common/helper/formatter.helper';
import { SmsWithDrawTransactionService } from '../../../sms/sms-withdraw-transaction.service';

@Injectable()
export class WithdrawListeners {
  constructor(
    private readonly smsWithDrawTransactionService: SmsWithDrawTransactionService
  ) {}

  @OnEvent(EventsConstant.TRANSACTION_WITHDRAW)
  async onMessage(transaction: Transaction) {
    if (transaction) {
      this.smsWithDrawTransactionService.withdrawSms(transaction);
    }
  }

  @OnEvent(EventsConstant.TRANSACTION_SETTLE_CREDIT)
  async onUserCreditSettle(payload: [Transaction, number]) {}
}
