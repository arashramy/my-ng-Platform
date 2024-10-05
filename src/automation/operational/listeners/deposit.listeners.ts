import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';
import { Transaction } from '../entities/Transaction';
import {
  _formatDate,
  _priceFormat
} from '../../../common/helper/formatter.helper';
import { SmsDepositTransactionService } from '../../../sms/sms-deposit-transaction.service';

@Injectable()
export class DepositListeners {
  constructor(
    private readonly smsDepositTransactionService: SmsDepositTransactionService
  ) {}

  @OnEvent(EventsConstant.TRANSACTION_DEPOSIT)
  async onMessage(transactions: Transaction[]) {
    if (transactions?.length) {
      this.smsDepositTransactionService.sendSms(transactions);
    }
  }
}
