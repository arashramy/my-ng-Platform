import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getEnvPath } from './common/helper/env.helper';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmConfigService } from './common/typeorm/TypeOrmConfigService';
import { AuthModule } from './auth/auth.module';
import { MulterModule } from '@nestjs/platform-express';
import { storage } from './common/multer/storage.engine';
import { RemoteModule } from './remote/remote.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { PublicModule } from './public/public.module';
import { BaseModule } from './base/base.module';
import { AutomationModule } from './automation/automation.module';
import { CommonsModule } from './common/commons.module';
import { AccountingModule } from './accounting/accounting.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TreasuryModule } from './treasury/treasury.module';
import { CrmModule } from './crm/crm.module';
import { AuditModule } from './audit-log/audit.module';
import { ImageHubModule } from './image-hub/image-hub.module';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { ProjectManagementModule } from './project-management/project-management.module';
import { BackupModule } from './backup/backup.module';
import { IranMalModule } from './iranMal/iranMal.module';

const envFilePath: string = getEnvPath(`${__dirname}/common/envs`);

@Module({
  imports: [
    BackupModule,
    ScheduleModule.forRoot(),
    HttpModule,
    ConfigModule.forRoot({ envFilePath, isGlobal: true }),
    TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService }),
    MulterModule.register({ storage: storage }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT')
        }
      })
    }),
    BullBoardModule.forRoot({ route: '/queues', adapter: ExpressAdapter, }),
    EventEmitterModule.forRoot({
      maxListeners: 0,
      ignoreErrors: true
    }),
    AuthModule,
    CommonsModule,
    PublicModule,
    BaseModule,
    AutomationModule,
    AccountingModule,
    TreasuryModule,
    CrmModule,
    ProjectManagementModule,
    // FaceApiModule,
    IranMalModule,
    RemoteModule,
    AuditModule,
    ImageHubModule,
  ],
  controllers: [],
  providers: []
})
export class AppModule {}
