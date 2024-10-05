import { Injectable } from '@nestjs/common';
import { NotificationType } from './NotificationAbstractService';
import { ModuleRef } from '@nestjs/core';
import { SettingKey } from '../base/entities/Setting';
import { SettingService } from '../common/service/setting.service';

export class NotificationTemplateDTO {
  templateName: NotificationMessageTemplate;
  mobile?: string;
  email?: string;
  expired?: number;
  tokens?: { [key: string]: any };
  customTemplate?: boolean;
}

export class EmailNotificationTemplateDTO {
  receiver: string;
  text?: string;
  templateName?: string;
  subject: string;
  customTemplate?: string;
}

export enum NotificationMessageTemplate {
  OTP = 'otp',
  CancelReserveTemplate = 'cancelreservation',
  BuyServiceTemplateCharge = 'buy_service_template_charge',
  BuyServiceTemplateSession = 'buy_service_template_session',
  DepositTemplate = 'charge_wallet_template',
  FactoryTemplate = 'factory_template',
  SaveServiceContractorsTemplate = 'save_service_contractors_template',
  UseServiceChargeTemplate = 'use_service_template_charge',
  UseSessionServiceTemplate = 'use_service_template_session',
  WithdrawWalletTemplate = 'use_wallet_template',
  GiftPackageTemplate = 'gift_package_template',
  CashBackTemplate = 'cash_back_template',
  WelcomeTemplate = 'welcome_template',
  ContractorRegisteredServiceTemplate = 'register_service_contractor',
  BackupTemplate = 'backup_sms',
  ReserveTemplate = 'reserve_pattern',
  happyBirthdayPattern = 'happy_birthday_pattern',
}

@Injectable()
export class NotificationService {
  constructor(
    private moduleRef: ModuleRef,
    private settingService: SettingService
  ) {}

  async send(data) {
    return (await this.getService())?.send(data);
  }

  async sendByTemplate(data) {
    return (await this.getService())?.sendByTemplate(data);
  }

  async getService() {
    let type: NotificationType = (
      await this.settingService.get(SettingKey.Notification)
    )?.provider;
    if (!type) {
      type = NotificationType.Gama;
    }
    if (type) {
      return this.moduleRef.get(`PROVIDER_${type}`);
    }
    return null;
  }
}
