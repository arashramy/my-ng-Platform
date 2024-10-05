import { Module, Provider } from '@nestjs/common';
import { GamaSmsService } from './sms/gama/GamaSmsService';
import { NotificationService } from './NotificationService';
import { NotificationType } from './NotificationAbstractService';
import { HttpModule } from '@nestjs/axios';
import { NotificationListener } from './NotificationListener';
import { CommonsModule } from '../common/commons.module';
import { SendGridEmailService } from './email/sendgrid2/SendGridEmailService';

const SERVICE_PROVIDERS: Provider[] = [
  {
    provide: `PROVIDER_${NotificationType.Gama}`,
    useClass: GamaSmsService
  },
  {
    provide: `PROVIDER_${NotificationType.SendGrid}`,
    useClass: SendGridEmailService
  }
];

@Module({
  providers: [...SERVICE_PROVIDERS, NotificationService, NotificationListener],
  exports: [NotificationService],
  imports: [HttpModule, CommonsModule]
})
export class NotificationModule {}
