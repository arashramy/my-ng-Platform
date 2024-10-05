import { Process, Processor } from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bull';
import { User } from '../../base/entities/User';
import { AppLoggerService } from '../../logger/logger.service';
import { CHALK_SERVICE_LOGGER_PROVIDER } from '../../logger/chalk-logger/chalk-provider';
import {
  NotificationMessageTemplate,
  NotificationTemplateDTO
} from '../../notification/NotificationService';
import { EventsConstant } from '../../common/constant/events.constant';

@Processor('happy-birthday')
export class HappyBirthdayQueue {
  @Inject(EventEmitter2) eventEmitter: EventEmitter2;

  @Inject(AppLoggerService)
  private readonly appLoggerService: AppLoggerService;

  @Process()
  async sendMessage(job: Job<{ user: User }>) {
    console.log('sendMessage queue fired ...', job?.data?.user);
    const user = job?.data?.user;
    try {
      const smsTemplate: NotificationTemplateDTO = {
        templateName: NotificationMessageTemplate.happyBirthdayPattern,
        mobile: user?.mobile,
        email: user?.email,
        tokens: {
          customer_name: user.firstName + ' ' + user.lastName
        }
      };
      await this.eventEmitter.emitAsync(
        EventsConstant.SMS_NOTIFICATION,
        smsTemplate
      );
    } catch (error) {
      console.log('error in HappyBirthdayQueue : ', error);
      this.appLoggerService.setLogger(CHALK_SERVICE_LOGGER_PROVIDER).log(error);
    }
  }
}
