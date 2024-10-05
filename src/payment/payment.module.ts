import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

import { StripeService } from './services/stripe.service';
import { ZarinPalService } from './services/zarinpal.service';
import { PayPingService } from './services/payping.service';
import { PayPingController } from './controller/payping.controller';
import { SaleOrderService } from '../automation/operational/service/sale-order.service';
import { TransactionService } from '../automation/operational/service/transaction.service';
import { SaleItemService } from '../automation/operational/service/sale-item.service';
import { ShiftWorkService } from '../base/service/shift-work.service';
import { LockerService } from '../automation/base/service/locker.service';
import { LoanService } from '../automation/operational/service/loan.service';
import { DiscountService } from '../crm/service/discount.service';
import { ChargingServiceProvider } from '../automation/operational/service/charging-service.service';
import { WalletGiftService } from '../automation/operational/service/wallet-gift.service';
import { ProductItemService } from '../automation/operational/service/product-item.service';
import { ServiceItemService } from '../automation/operational/service/service-item.service';
import { CreditProductProvider } from '../automation/operational/service/credit-product-provider';
import { PackageItemService } from '../automation/operational/service/package-item.service';
import { RegisteredProductProvider } from '../automation/operational/service/registered-product-provider';
import { ProductService } from '../automation/base/service/product.service';
import { ContractorService } from '../automation/base/service/contractor.service';
import { AuthModule } from '../auth/auth.module';
import { CommonsModule } from '../common/commons.module';
import { HttpModule } from '@nestjs/axios';
import { UserActivityService } from '../automation/operational/service/user-activity.service';
import { ReceptionService } from '../automation/operational/service/reception.service';
import { AutoMationLogoutService } from '../automation/operational/service/automatic-logout.service';

@Module({
  controllers: [PaymentController, PayPingController],
  providers: [
    PaymentService,
    SaleOrderService,
    // AutoMationLogoutService,
    TransactionService,
    SaleItemService,
    UserActivityService,
    ShiftWorkService,
    LockerService,
    LoanService,
    DiscountService,
    ChargingServiceProvider,
    WalletGiftService,
    ProductItemService,
    ServiceItemService,
    CreditProductProvider,
    PackageItemService,
    RegisteredProductProvider,
    ProductService,
    ContractorService,
    StripeService,
    ZarinPalService,
    PayPingService,
    ReceptionService,
    AutoMationLogoutService
  ],
  imports: [AuthModule, CommonsModule, HttpModule]
})
export class PaymentModule {}

// apiKey:
// 'pk_live_51Oc15uGGu0fms4oyo6c5tySzxbQQoAByyFfpkLCYKJ2NbX82fMWqU0Rs2GBSfXBirgJhF3ru1t50JjNaXn0My3gV00M1QrzmEX',
// apiVersion: '2020-08-27'
