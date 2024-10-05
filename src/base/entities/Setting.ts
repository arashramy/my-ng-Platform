import { Column, Entity } from 'typeorm';
import { CoreEntity } from './CoreEntity';
import { Audit } from '../../common/decorators/audit.decorator';

export enum SettingKey {
  SystemInfo,
  SystemConfig,
  ThemeConfig,
  AuthSlider,
  Notification,
  Email,
  Gama,
  locker,
  RequiredPassword,
  LoanNotificationConfig,
  LegalTimeFrame,
  ImageHubType,
  DeviceConfig,
  IdentificationConfig,
  KavenegarConfig,
  MonthsConfig,
  BackupConfig,
  TransferShopConfig,
  SmsAccount,
  ActivitySetting,
  Insurance,
  NodeMailer,
  SendToTax,
  OnlineSetting,
}

@Audit()
@Entity({ name: '_setting' })
export class Setting extends CoreEntity {
  @Column('int', { name: 'config_key', unique: true })
  key?: SettingKey;

  @Column('json', { name: 'config_value' })
  value: any;

  static async findByKey(key: any) {
    return (await this.findOne({ where: { key: key }, cache: true }))?.value;
  }
}
