import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { TransactionService } from './service/transaction.service';
import { RegisteredServiceController } from './controller/registered-service.controller';
import { SaleItemController } from './controller/sale-item.controller';
import { BullModule } from '@nestjs/bull';
import { CommonsModule } from '../../common/commons.module';
import { AutomationBaseModule } from '../base/automation-base.module';
import { ShopReportOrderService } from '../report/service/shop-order-report.service';
import { TransactionController } from './controller/transaction.controller';
import { RegisteredProductProvider } from './service/registered-product-provider';
import { ProductItemService } from './service/product-item.service';
import { ServiceItemService } from './service/service-item.service';
import { BaseModule } from '../../base/base.module';
import { SaleOrderService } from './service/sale-order.service';
import { SaleItemService } from './service/sale-item.service';
import { CreditProductProvider } from './service/credit-product-provider';
import { ReceptionService } from './service/reception.service';
import { SaleOrderController } from './controller/sale-order.controller';
import { ChargingServiceProvider } from './service/charging-service.service';
import { WalletGiftService } from './service/wallet-gift.service';
import { LoanService } from './service/loan.service';
import { CrmModule } from '../../crm/crm.module';
import { UserLoanController } from './controller/user-loan.controller';
import { ChargingServiceListeners } from './listeners/charging-service.listeners';
import { DepositListeners } from './listeners/deposit.listeners';
import { WithdrawListeners } from './listeners/withdraw.listeners';
import { SessionalListeners } from './listeners/sessional.listeners';
import { SaleOrderListeners } from './listeners/sale-order.listeners';
import { ArchivedProvider } from './service/archived-provider';
import { PackageItemService } from './service/package-item.service';
import { LocalLockerManagerService } from '../../remote/locker-manager/service/local-locker-manager.service';
import { LockerService } from '../../remote/locker-manager/service/locker.service';
import { HttpModule } from '@nestjs/axios';
import { NotificationModule } from '../../notification/notification.module';
import { UserReportListener } from './listeners/user-report.listener';
import { CashBackService } from './service/cash-back.service';
import { CashBackServiceGeneratorService } from './service/cash-back-service-generator.service';
import { SMSModule } from '../../sms/sms.module';
import { OnlineShoppingController } from './controller/online-shop.controller';
import { UserAttachmentController } from './controller/user-attachment.controller';
import { UserActivityController } from './controller/user-activity.controller';
import { UserActivityService } from './service/user-activity.service';
import { BurnSessionController } from './controller/burn-session.controller';
import { ReservationController } from './controller/reservation.controller';
import { EventsController } from './controller/events.controller';
import { ReserveServiceProcessor } from './service/reserve.service';
import { ReserveSecondaryServiceServiceProcessor } from './service/reserve-secondary-service.service';
import { PaymentModule } from '../../payment/payment.module';
import { UserActivityListeners } from './listeners/user-activity.listener';
import { SentToTaxServiceProcessor } from './service/sent-to-tax.service';
import { LockerAssignListeners } from '../../automation/operational/listeners/locker-assign.listeners';
import { RefactorDataController } from './controller/refactor-data.controller';
import { RemainCreditServiceProcess } from './service/remain-creit-fix.service';
import { AutoMationLogoutService } from './service/automatic-logout.service';

@Module({
  controllers: [
    RegisteredServiceController,
    SaleOrderController,
    TransactionController,
    SaleItemController,
    UserLoanController,
    OnlineShoppingController,
    UserAttachmentController,
    UserActivityController,
    BurnSessionController,
    ReservationController,
    EventsController,
    RefactorDataController
  ],
  providers: [
    AutoMationLogoutService,
    UserActivityService,
    CashBackServiceGeneratorService,
    CashBackService,
    UserReportListener,
    TransactionService,
    ShopReportOrderService,
    RegisteredProductProvider,
    ProductItemService,
    ServiceItemService,
    SaleOrderService,
    SaleItemService,
    PackageItemService,
    CreditProductProvider,
    ReceptionService,
    ChargingServiceProvider,
    WalletGiftService,
    ArchivedProvider,
    LoanService,
    ChargingServiceListeners,
    DepositListeners,
    WithdrawListeners,
    SessionalListeners,
    SaleOrderListeners,
    LockerAssignListeners,
    LocalLockerManagerService,
    LockerService,
    ReserveServiceProcessor,
    RemainCreditServiceProcess,
    ReserveSecondaryServiceServiceProcessor,
    SentToTaxServiceProcessor,
    UserActivityListeners
  ],
  exports: [
    ReceptionService,
    AutoMationLogoutService,
    TransactionService,
    ShopReportOrderService,
    RegisteredProductProvider,
    ProductItemService,
    ServiceItemService,
    PackageItemService,
    SaleOrderService,
    SaleItemService,
    CreditProductProvider,
    ReceptionService,
    ChargingServiceProvider,
    WalletGiftService,
    LoanService
  ],
  imports: [
    SMSModule,
    AuthModule,
    CommonsModule,
    PaymentModule,
    BullModule.registerQueue({ name: 'gift-package' }),
    BullModule.registerQueue({
      name: 'logout-reception'
    }),
    BullModule.registerQueue({
      name: 'shop-report'
    }),
    BullModule.registerQueue({
      name: 'sms-notification'
    }),
    BullModule.registerQueue({
      name: 'reserve-order'
    }),
    BullModule.registerQueue({
      name: 'sent-to-tax'
    }),
    BullModule.registerQueue({
      name: 'reserve-secondary-order'
    }),
    BullModule.registerQueue({
      name: 'fix-saleItem-remainCredit'
    }),
    AutomationBaseModule,
    BaseModule,
    CrmModule,
    HttpModule,
    NotificationModule
  ]
})
export class AutomationOperationalModule {}
