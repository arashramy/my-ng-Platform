import { Injectable } from '@nestjs/common';
import { Setting, SettingKey } from '../base/entities/Setting';
import {
  NotificationService,
  NotificationTemplateDTO,
  EmailNotificationTemplateDTO
} from './NotificationService';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsConstant } from '../common/constant/events.constant';
import { SettingService } from '../common/service/setting.service';
import {
  SmsTransaction,
  SmsTransactionType
} from '../sms/sms-transaction/sms-transaction';

@Injectable()
export class NotificationListener {
  constructor(
    private notificationService: NotificationService,
    private settingService: SettingService
  ) {}

  @OnEvent(EventsConstant.SMS_NOTIFICATION)
  async send(param: NotificationTemplateDTO) {
    const config = await this.getConfig();
    const systemInfo: any = await this.settingService.get(
      SettingKey.SystemInfo
    );
    const notificationConfig = await this.settingService.get(
      SettingKey.Notification
    );

    if (
      !param.customTemplate &&
      (!notificationConfig || !notificationConfig[param.templateName])
    ) {
      console.error(
        'Notification config not found or is disabled',
        param.templateName,
        notificationConfig
      );
      return;
    }
    const templateName = param?.customTemplate
      ? param.templateName
      : config[param.templateName];

    if (!templateName) {
      console.error('Invalid template name', param.templateName);
      return;
    }

    Object.assign(param.tokens, {
      company_name: systemInfo?.title,
      phone: systemInfo?.phones?.join('-'),
      website: systemInfo?.website || 'varzeshsoft.com'
    });

    console.log(':::::::::::');
    if (notificationConfig.notificationType === 'sms') {
      const smsAccount = await Setting.findByKey(SettingKey.SmsAccount);
      if (!smsAccount?.credit || smsAccount?.credit < 1) {
        console.log('prepare credit please : increse your credit');
        return;
      }

      // send message to queue
      if (smsAccount?.tarrif && smsAccount?.credit) {
        const price = (await this.getConfig())?.[param.templateName + '_price'];
        const newData = {
          ...smsAccount,
          credit: +smsAccount.credit - (+price || +smsAccount?.tarrif)
        };
        await Setting.update(
          { key: SettingKey.SmsAccount },
          { value: newData }
        );
        await SmsTransaction.save(
          await SmsTransaction.create({
            currentAmount: smsAccount.credit,
            amount: newData.credit,
            isSuccess: true,
            type: SmsTransactionType.WithDraw,
            destNumber: param?.mobile,
            content: param?.templateName
          })
        );
      }
      console.log('sended sms config', { ...param, templateName });
      return this.notificationService.sendByTemplate({
        ...param,
        templateName
      });
    } else {
      console.log({
        datas: param.tokens,
        receiver: param.email,
        subject: this.getSubject(param.templateName),
        templateName: param.templateName
      });
      return this.notificationService.sendByTemplate({
        datas: param.tokens,
        receiver: param.email,
        subject: this.getSubject(param.templateName),
        templateName: param.templateName
      });
    }
  }

  async getConfig() {
    return this.settingService.get(
      (await this.notificationService.getService()).name()
    );
  }

  getSubject(templateName: string) {
    if (templateName === 'charge_wallet_template') {
      return 'Deposite Your Credit';
    } else if (templateName === 'use_wallet_template') {
      return 'Withdraw Your Credit';
    } else if (templateName === 'welcome_template') {
      return 'Welcome User To Varzeshsoft';
    } else if (templateName === 'use_service_template_session') {
      return 'You Use Your Registered Service Session';
    } else if (templateName === 'use_service_template_charge') {
      return 'You Use Your Chargable Service Session';
    } else if (templateName === 'save_service_contractors_template') {
      return 'Hey Contractor, Someone Use Your Service';
    } else if (templateName === 'reserve_pattern') {
      return 'Hey Customer, You Have Reserved Session, Watch Out !!!';
    } else if (templateName === 'register_service_contractor') {
      return 'Hey Contractor, Someone get new service that your are contractor';
    } else if (templateName === 'gift_package_template') {
      return 'Hi, New Gift Package Created For You From Varzeshsoft';
    } else if (templateName === 'factory_template') {
      return 'New Shop Order Created For You, Check it from varzeshsoft crm panel';
    } else if (templateName === 'cash_back_template') {
      return 'Hi !!! We Have Cashed Backed Service For You, Check it';
    } else if (templateName === 'buy_service_template_session') {
      return 'Buy New Service';
    } else if (templateName === 'buy_service_template_charge') {
      return 'Buy New Chargable Service';
    }
  }
}
