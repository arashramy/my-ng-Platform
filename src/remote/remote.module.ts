import { Adapter } from './adapter.service';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MqttBrokerService } from './service/mqtt-broker.service';
import { CommandHandlerService } from './service/command-handler.service';
import { RemoteTokenService } from './service/remote-token.service';
import { LockerService } from './locker-manager/service/locker.service';
import { HttpModule } from '@nestjs/axios';
import { LockerManagerController } from './locker-manager/controller/locker-manager.controller';
import { AuthModule } from '../auth/auth.module';
import { ExcelService } from '../common/export/ExcelService';
import { AutomationOperationalModule } from '../automation/operational/automation-operational.module';
import { CommonsModule } from '../common/commons.module';
import { DeviceModule } from './device/device.module';
import { LockerManagerServiceProvider } from './provider';

@Module({
  controllers: [LockerManagerController],
  imports: [
    CommonsModule,
    JwtModule.register({}),
    HttpModule,
    AuthModule,
    AutomationOperationalModule,
    DeviceModule,
  ],
  providers: [
    ExcelService,
    MqttBrokerService,
    CommandHandlerService,
    RemoteTokenService,
    LockerService,
    Adapter,
    LockerManagerServiceProvider,
  ],
})
export class RemoteModule {}
