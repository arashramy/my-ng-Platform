import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { LockerController } from './controller/locker.controller';
import { ProductController } from './controller/product.controller';
import { ProductCategoryController } from './controller/product-category.controller';
import { WalletGiftController } from './controller/wallet-gift.controller';
import { CommonsModule } from '../../common/commons.module';
import { ProductService } from './service/product.service';
import { LocationsController } from '../../base/controller/locations.controller';
import { GroupClassRoomController } from './controller/group-class-room.controller';
import { ContractorService } from './service/contractor.service';
import { LockerService } from './service/locker.service';
import { LimitedCreditService } from './service/limited-credit.service';
import { StandSettingController } from './controller/stand-setting.controller';
import { SaleUnitService } from '../../base/service/sale-unit.service';
import { LoanController } from './controller/loan.controller';
import { OnlineShopProductController } from './controller/online-shop.-product.controller';
import { ReportTagProductController } from './controller/report-tag-product.controller';
import { ReservePatternController } from './controller/reserve-pattern.controller';
import { ReserveTagController } from './controller/reserve-tag.controller';
import { UserActivityService } from '../operational/service/user-activity.service';

@Module({
  controllers: [
    ReservePatternController,
    ReserveTagController,
    LockerController,
    ProductController,
    ReportTagProductController,
    ProductCategoryController,
    WalletGiftController,
    LocationsController,
    GroupClassRoomController,
    StandSettingController,
    LoanController,
    OnlineShopProductController
  ],
  imports: [AuthModule, CommonsModule],
  providers: [
    ProductService,
    ContractorService,
    LockerService,
    LimitedCreditService,
    SaleUnitService,
    UserActivityService
  ],
  exports: [
    ProductService,
    ContractorService,
    LockerService,
    LimitedCreditService
  ]
})
export class AutomationBaseModule {}
