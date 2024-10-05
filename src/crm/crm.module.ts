import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonsModule } from '../common/commons.module';
import { TicketService } from './service/TicketService';
import { TicketController } from './controller/ticket.controller';
import { UserEventController } from './controller/user-event.controller';
import { OfferedDiscountController } from './controller/offered-discount.controller';
import { DiscountService } from './service/discount.service';
import { UserLevelController } from './controller/user-level.controller';
import { GiftPackageProcessor } from './processor/gift-package.processor';
import { BullModule } from '@nestjs/bull';
import { GiftPackageController } from './controller/gift-package.controller';
import { SaleOrderService } from '../automation/operational/service/sale-order.service';
import { TransactionService } from '../automation/operational/service/transaction.service';
import { SaleItemService } from '../automation/operational/service/sale-item.service';
import { ShiftWorkService } from '../base/service/shift-work.service';
import { LockerService } from '../automation/base/service/locker.service';
import { ChargingServiceProvider } from '../automation/operational/service/charging-service.service';
import { WalletGiftService } from '../automation/operational/service/wallet-gift.service';
import { RegisteredProductProvider } from '../automation/operational/service/registered-product-provider';
import { ProductItemService } from '../automation/operational/service/product-item.service';
import { ServiceItemService } from '../automation/operational/service/service-item.service';
import { CreditProductProvider } from '../automation/operational/service/credit-product-provider';
import { PackageItemService } from '../automation/operational/service/package-item.service';
import { ProductService } from '../automation/base/service/product.service';
import { ContractorService } from '../automation/base/service/contractor.service';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { AppLoggerModule } from '../logger/logger.module';
import { GiftPackageProcessService } from './service/gift-package.service';
import { LoanService } from '../automation/operational/service/loan.service';
import { UserActivityService } from '../automation/operational/service/user-activity.service';
import { HttpModule } from '@nestjs/axios';
import { ReceptionService } from '../automation/operational/service/reception.service';
import { AutoMationLogoutService } from '../automation/operational/service/automatic-logout.service';

@Module({
  controllers: [
    OfferedDiscountController,
    TicketController,
    UserEventController,
    UserLevelController,
    GiftPackageController
  ],
  imports: [
    HttpModule,
    AuthModule,
    CommonsModule,
    BullModule.registerQueue({ name: 'gift-package' }),
    BullBoardModule.forFeature({ name: 'gift-package', adapter: BullAdapter }),
    BullBoardModule.forFeature({ name: 'sent-to-tax', adapter: BullAdapter }),
    AppLoggerModule
  ],
  providers: [
    TicketService,
    DiscountService,
    GiftPackageProcessor,
    SaleOrderService,
    TransactionService,
    SaleItemService,
    ShiftWorkService,
    LockerService,
    ChargingServiceProvider,
    WalletGiftService,
    RegisteredProductProvider,
    ProductItemService,
    ServiceItemService,
    CreditProductProvider,
    PackageItemService,
    ProductService,
    ContractorService,
    GiftPackageProcessService,
    LoanService,
    UserActivityService,
    ReceptionService,
    AutoMationLogoutService
  ],
  exports: [TicketService, DiscountService]
})
export class CrmModule {}
