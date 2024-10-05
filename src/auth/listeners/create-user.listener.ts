import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsConstant } from '../../common/constant/events.constant';
import { SmsUserService } from '../../sms/sms-user.service';

interface CreateUserSmsDTO {
  firstName: string;
  lastName: string;
  mobile: string;
  password: string;
  email: string;
}

@Injectable()
export class CreateUserListener {
  @Inject(SmsUserService) private readonly smsUserService: SmsUserService;

  @OnEvent(EventsConstant.CREATE_USER_SMS)
  async createUserSms({
    firstName,
    lastName,
    mobile,
    password,
    email
  }: CreateUserSmsDTO) {
    await this.smsUserService.sendWelcomeSms({
      firstName,
      lastName,
      mobile,
      password,
      email
    });
  }
}
