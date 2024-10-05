import { Module } from '@nestjs/common';
import { ShopModule } from './shop/shop.module';
import { AppController } from './app.controller';
import { CommonsModule } from '../common/commons.module';
import { NotificationModule } from '../notification/notification.module';
import { NotificationService } from '../notification/NotificationService';

@Module({
  imports: [CommonsModule, ShopModule, NotificationModule],
  controllers: [AppController],
  providers: [NotificationService]
})
export class PublicModule {}
