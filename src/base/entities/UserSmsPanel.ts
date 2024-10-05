import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { User } from './User';
import { CoreEntity } from './CoreEntity';

export enum UserSmsPanelKey {
  getDepositeCreditSMS = 'getDepositeCreditSMS',
  getWithdrawCreditSMS = 'getWithdrawCreditSMS',
  getOrderSMS = 'getOrderSMS',
  getUsedSessionalServiceSMS = 'getUsedSessionalServiceSMS',
  getUsedChargableServiceSMS = 'getUsedChargableServiceSMS',
  getUsedContractorSMS = 'getUsedContractorSMS',
  getRegisteredChargableServiceSMS = 'getRegisteredChargableServiceSMS',
  getRegisteredSessionalServiceSMS = 'getRegisteredSessionalServiceSMS',
}

@Entity({ name: '_user_sms_panel' })
export class UserSmsPanel extends CoreEntity {
  @Column({ name: 'deposite_credit', default: true })
  getDepositCreditSMS?: boolean;

  @Column({ name: 'withdraw_credit', default: true })
  getWithdrawCreditSMS?: boolean;

  @Column({ name: 'order', default: true })
  getOrderSMS?: boolean;

  @Column({ name: 'used_sessional_service', default: true })
  getUsedSessionalServiceSMS?: boolean;

  @Column({ name: 'used_chargable_service', default: true })
  getUsedChargableServiceSMS?: boolean;

  @Column({ name: 'used_contractor', default: true })
  getUsedContractorSMS?: boolean;

  @Column({ name: 'registered_chargable_service', default: true })
  getRegisteredChargableServiceSMS?: boolean;

  @Column({ name: 'registered_sessional_service', default: true })
  getRegisteredSessionalServiceSMS?: boolean;

  @OneToOne(() => User, (user) => user.userSmsPanel)
  @JoinColumn()
  user: User;
}
