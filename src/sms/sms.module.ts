import { Module } from '@nestjs/common';
import { SmsSaleOrderService } from './sms-sale-order.service';
import { SmsUserService } from './sms-user.service';
import { SmsWithDrawTransactionService } from './sms-withdraw-transaction.service';
import { SmsDepositTransactionService } from './sms-deposit-transaction.service';
import { SmsCashBackService } from './sms-cash-back.service';
import { SmsBackupService } from './sms-backup.service';
import { SmsTransactionController } from './sms-transaction/sms-transaction.controller';
import { CheckPlan } from '../auth/guard/check.plan';
import { HttpModule } from '@nestjs/axios';
import { ResolveHelper } from '../common/helper/resolver-data.helper';
import { ExcelService } from '../common/export/ExcelService';
import { ImportService } from '../common/import/ImportService';
import { TokenStoreService } from '../auth/service/token-store.service';
import { SmsReserveService } from './sms-reserve.service';

@Module({
  imports: [HttpModule],
  controllers: [SmsTransactionController],
  providers: [
    SmsSaleOrderService,
    SmsUserService,
    SmsWithDrawTransactionService,
    SmsDepositTransactionService,
    SmsCashBackService,
    SmsBackupService,
    CheckPlan,
    ResolveHelper,
    ExcelService,
    ImportService,
    TokenStoreService,
    SmsReserveService
  ],
  exports: [
    SmsSaleOrderService,
    SmsBackupService,
    SmsUserService,
    SmsWithDrawTransactionService,
    SmsDepositTransactionService,
    SmsCashBackService,
    SmsReserveService
  ]
})
export class SMSModule {}
