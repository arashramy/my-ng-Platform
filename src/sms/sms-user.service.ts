import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../common/constant/events.constant';
import {
  NotificationTemplateDTO,
  NotificationMessageTemplate
} from '../notification/NotificationService';

interface SendWelcomeSmsDto {
  firstName: string;
  lastName: string;
  mobile: string;
  password: string;
  email: string;
}

@Injectable()
export class SmsUserService {
  @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2;

  async sendWelcomeSms({
    firstName,
    lastName,
    mobile,
    password,
    email
  }: SendWelcomeSmsDto) {
    const smsTemplate: NotificationTemplateDTO = {
      templateName: NotificationMessageTemplate.WelcomeTemplate,
      email,
      mobile,
      tokens: {
        customer_name: firstName.concat(' ', lastName),
        customer_mobile: mobile,
        customer_password: password,
        customer_email: email
      }
    };
    await this.eventEmitter.emitAsync(
      EventsConstant.SMS_NOTIFICATION,
      smsTemplate
    );
  }
}
