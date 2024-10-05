import { Module } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { UsersService } from '../../auth/service/users.service';
import { PalizAdapterService } from './adapters/paliz-adapter/paliz-adapter.service';
import { TransactionService } from '../../automation/operational/service/transaction.service';
import { SaleItemService } from '../../automation/operational/service/sale-item.service';
import { ShiftWorkService } from '../../base/service/shift-work.service';
import { LockerService } from '../../automation/base/service/locker.service';
import { LockerService as LockerManagerService } from '../locker-manager/service/locker.service';
import { DiscountService } from '../../crm/service/discount.service';
import { ChargingServiceProvider } from '../../automation/operational/service/charging-service.service';
import { WalletGiftService } from '../../automation/operational/service/wallet-gift.service';
import { ProductItemService } from '../../automation/operational/service/product-item.service';
import { ServiceItemService } from '../../automation/operational/service/service-item.service';
import { CreditProductProvider } from '../../automation/operational/service/credit-product-provider';
import { RegisteredProductProvider } from '../../automation/operational/service/registered-product-provider';
import { ProductService } from '../../automation/base/service/product.service';
import { ContractorService } from '../../automation/base/service/contractor.service';
import { SseService } from '../../common/sse/sse.service';
import { HttpModule } from '@nestjs/axios';
import { LockerManagerServiceProvider } from '../provider';
import { MqttBrokerService } from '../service/mqtt-broker.service';
import { CommandHandlerService } from '../service/command-handler.service';
import { RemoteTokenService } from '../service/remote-token.service';
import { JwtModule } from '@nestjs/jwt';
import { ReceptionService } from '../../automation/operational/service/reception.service';
import { VirdiAdapterService } from './adapters/virdi-adapter/virdi-adapter.service';
import { AutomationOperationalModule } from '../../automation/operational/automation-operational.module';
import { AdapterService } from './adapters/adapter.service';
import { ReceptionDeviceOpt } from './opt/reception.opt';
import { ExitDeviceOpt } from './opt/exit.opt';
import { LockerDeviceOpt } from './opt/locker.opt';
import { LocalLockerManagerService } from '../locker-manager/service/local-locker-manager.service';
import { ShopDeviceOpt } from './opt/shop.opt';
import { DeviceLogService } from './device-log.service';
import { UserActivityService } from '../../automation/operational/service/user-activity.service';
import { AppLoggerService } from '../../logger/logger.service';
import { BullModule } from '@nestjs/bull';
import { HappyBirthdayQueue } from '../../auth/service/happy-bithday-queue.service';
import { ExcelService } from '../../common/export/ExcelService';

export const DEVICE_ADAPTER_PROVIDER = [
  {
    provide: 'PROVIDER_PALIZ',
    useClass: PalizAdapterService
  },
  {
    provide: 'PROVIDER_VIRDI',
    useClass: VirdiAdapterService
  }
];

@Module({
  imports: [
    HttpModule,
    JwtModule,
    AutomationOperationalModule,
    BullModule.registerQueue({ name: 'happy-birthday' })
  ],
  controllers: [DeviceController],
  providers: [
    DeviceLogService,
    ExcelService,
    ShopDeviceOpt,
    LockerDeviceOpt,
    ExitDeviceOpt,
    ReceptionDeviceOpt,
    UserActivityService,
    DeviceService,
    UsersService,
    PalizAdapterService,
    LocalLockerManagerService,
    AdapterService,
    TransactionService,
    SaleItemService,
    ShiftWorkService,
    DiscountService,
    ChargingServiceProvider,
    WalletGiftService,
    ProductItemService,
    ServiceItemService,
    CreditProductProvider,
    RegisteredProductProvider,
    ProductService,
    ContractorService,
    SseService,
    MqttBrokerService,
    CommandHandlerService,
    RemoteTokenService,
    LockerService,
    LockerManagerService,
    LockerManagerServiceProvider,
    ReceptionService,
    ...DEVICE_ADAPTER_PROVIDER,
    AppLoggerService
  ],
  exports: [...DEVICE_ADAPTER_PROVIDER, AdapterService, PalizAdapterService]
})
export class DeviceModule {}
