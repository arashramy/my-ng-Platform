import { Module } from '@nestjs/common';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from '../../auth/auth.module';
import { CommonsModule } from '../../common/commons.module';
import { SaleUnitService } from '../../base/service/sale-unit.service';
import { SaleOrderService } from '../../automation/operational/service/sale-order.service';
import { AutomationOperationalModule } from '../../automation/operational/automation-operational.module';
import { BaseModule } from '../../base/base.module';
import { AutomationBaseModule } from '../../automation/base/automation-base.module';
import { UserActivityService } from '../../automation/operational/service/user-activity.service';

@Module({
  imports: [
    HttpModule,
    CommonsModule,

    BullModule.registerQueue({
      name: 'sms-notification'
    }),
    AuthModule,
    BaseModule,
    AutomationBaseModule,
    AutomationOperationalModule
  ],
  controllers: [ShopController],
  providers: [
    ShopService,
    SaleUnitService,
    SaleOrderService,
    UserActivityService
  ]
})
export class ShopModule {}
