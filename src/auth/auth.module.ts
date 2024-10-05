import { Module } from '@nestjs/common';
import { AuthService } from './service/auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { UsersService } from './service/users.service';
import { NotificationModule } from '../notification/notification.module';
import { PasswordValidator } from './validators/password-validator.service';
import { ProfileController } from './profile.controller';
import { AccessLimitGuard } from './guard/access-limit.guard';
import { CheckPlan } from './guard/check.plan';
import { ResolveHelper } from '../common/helper/resolver-data.helper';
import { TokenStoreService } from './service/token-store.service';
import { HttpModule } from '@nestjs/axios';
import { AccessMqttTokenStrategy } from './strategies/remote-token.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisLockModule } from '@huangang/nestjs-simple-redis-lock/index';
import { RedisManager, RedisModule } from '@liaoliaots/nestjs-redis';
import { CreateUserListener } from './listeners/create-user.listener';
import { SMSModule } from '../sms/sms.module';
import { AppLoggerService } from '../logger/logger.service';
import { AppLoggerModule } from '../logger/logger.module';
import { HappyBirthdayQueue } from '../auth/service/happy-bithday-queue.service';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    SMSModule,
    JwtModule.register({}),
    NotificationModule,
    HttpModule.register({}),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        closeClient: true,
        config: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT')
        }
      }),
      inject: [ConfigService]
    }),
    RedisLockModule.registerAsync({
      useFactory: async (redisManager: RedisManager) => {
        return { prefix: ':lock:', client: redisManager.getClient() };
      },
      inject: [RedisManager]
    }),
    AppLoggerModule,
    BullModule.registerQueue({ name: 'happy-birthday' })
  ],

  controllers: [AuthController, ProfileController],
  providers: [
    HappyBirthdayQueue,
    AuthService,
    UsersService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    PasswordValidator,
    AccessMqttTokenStrategy,
    AccessLimitGuard,
    CheckPlan,
    ResolveHelper,
    TokenStoreService,
    CreateUserListener,
    AppLoggerService
  ],
  exports: [
    CheckPlan,
    TokenStoreService,
    UsersService,
    AuthService,
    HappyBirthdayQueue
  ]
})
export class AuthModule {}
