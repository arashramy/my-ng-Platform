import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import moment from 'moment-jalaali';
import { Setting, SettingKey } from '../base/entities/Setting';
import { User } from '../base/entities/User';
import { EventsConstant } from '../common/constant/events.constant';
import { _priceFormat } from '../common/helper/formatter.helper';
import {
  NotificationTemplateDTO,
  NotificationMessageTemplate
} from '../notification/NotificationService';
import { In } from 'typeorm';

@Injectable()
export class SmsBackupService {
  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;

  async sendBackupSms(isSuccess: boolean, time: string) {
    const setting = await Setting.findByKey(SettingKey.BackupConfig);
    let users: any[] = [];
    if (isSuccess) {
      users = [setting.okReceiverSms];
    } else {
      users = setting.failedReceiversSsms;
    }

    const usersInfo = await User.find({ where: { id: In(users) } });

    for (let i = 0; i < usersInfo.length; i++) {
      const user = usersInfo?.[i];
      const smsTemplate: NotificationTemplateDTO = {
        templateName: NotificationMessageTemplate.BackupTemplate,
        mobile: user.mobile,
        email: user.email,
        tokens: {
          date: moment().format('jYYYY/jMM/jDD'),
          time,
          message: isSuccess ? 'با موفقیت انجام شد' : 'شکست خورد'
        }
      };
      await this.eventEmitter.emitAsync(
        EventsConstant.SMS_NOTIFICATION,
        smsTemplate
      );
    }
  }
}
