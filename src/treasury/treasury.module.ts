import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonsModule } from '../common/commons.module';
import { ChequeController } from './controller/cheque.controller';
import { TransactionService } from '../automation/operational/service/transaction.service';
import { ShiftWorkService } from '../base/service/shift-work.service';
import { DiscountService } from '../crm/service/discount.service';
import { ChargingServiceProvider } from '../automation/operational/service/charging-service.service';
import { WalletGiftService } from '../automation/operational/service/wallet-gift.service';

@Module({
  controllers: [ChequeController],
  imports: [AuthModule, CommonsModule],
  providers: [
    TransactionService,
    ShiftWorkService,
    DiscountService,
    ChargingServiceProvider,
    WalletGiftService
  ],
  exports: []
})
export class TreasuryModule {}
