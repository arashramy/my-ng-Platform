import { Module } from '@nestjs/common';
import { BankController } from './controller/bank.controller';
import { CashDeskController } from './controller/cash-desk.controller';
import { FiscalYearController } from './controller/fiscal-year.controller';
import { GroupController } from './controller/group.controller';
import { IntroductionMethodController } from './controller/introduction-method.controller';
import { MediaController } from './controller/media.controller';
import { OrganizationUnitController } from './controller/organization-unit.controller';
import { SettingController } from './controller/setting-controller';
import { UsersController } from './controller/users.controller';
import { AuthModule } from '../auth/auth.module';
import { CommonsModule } from '../common/commons.module';
import { DashboardController } from './controller/dashboard.controller';
import { AttendanceDeviceController } from './controller/attendance-device.controller';
import { ShiftWorkController } from './controller/shift-work.controller';
import { ShiftWorkService } from './service/shift-work.service';
import { SaleUnitController } from './controller/sale-unit.controller';
import { UnitController } from './controller/unit.controller';
import { SaleUnitService } from './service/sale-unit.service';
import { ProvinceController } from './controller/province.controller';
import { CityController } from './controller/city.controller';
import { UrbanAreaController } from './controller/urban-area.controller';
import { DocumentController } from './controller/document.controller';
import { SurveyQuestionsController } from './controller/survey-questions.controller';
import { PosController } from './controller/pos.controller';
import { PosService } from './service/pos.service';
import { AttendanceDeviceLogController } from './controller/attendance-device-log.controller';
import { SaleOrderService } from '../automation/operational/service/sale-order.service';
import { TransactionService } from '../automation/operational/service/transaction.service';
import { SaleItemService } from '../automation/operational/service/sale-item.service';
import { LockerService } from '../automation/base/service/locker.service';
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
import { PrinterController } from './controller/printer.controller';
import { BackupModule } from '../backup/backup.module';
import { TransferTypeController } from './controller/transfer-type.controller';
import { GatewayController } from './controller/gateway.controller';
import { UserDescriptionController } from './controller/UserDescription.controller';
import { HttpModule, HttpService } from '@nestjs/axios';
import { LoanService } from '../automation/operational/service/loan.service';
import { UserActivityService } from '../automation/operational/service/user-activity.service';
import { LockerLocationController } from './controller/locker-location.controller';
import { ReceptionService } from '../automation/operational/service/reception.service';
import { AutoMationLogoutService } from '../automation/operational/service/automatic-logout.service';

@Module({
  controllers: [
    UserDescriptionController,
    PrinterController,
    LockerLocationController,
    SurveyQuestionsController,
    BankController,
    CashDeskController,
    FiscalYearController,
    GroupController,
    IntroductionMethodController,
    MediaController,
    OrganizationUnitController,
    SettingController,
    UsersController,
    DashboardController,
    AttendanceDeviceController,
    ShiftWorkController,
    SaleUnitController,
    UnitController,
    ProvinceController,
    CityController,
    UrbanAreaController,
    DocumentController,
    PosController,
    AttendanceDeviceLogController,
    TransferTypeController,
    GatewayController
  ],
  imports: [AuthModule, CommonsModule, BackupModule, HttpModule],
  providers: [
    ShiftWorkService,
    SaleUnitService,
    PosService,
    SaleOrderService,
    TransactionService,
    SaleItemService,
    LockerService,
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
    LoanService,
    UserActivityService,
    ReceptionService,
    AutoMationLogoutService
  ],
  exports: [ShiftWorkService, SaleUnitService, PosService]
})
export class BaseModule {}
