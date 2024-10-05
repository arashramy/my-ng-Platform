import { Column, Entity, JoinColumn, Like, ManyToOne } from 'typeorm';
import { Bank } from './Bank';
import { CoreEntity } from './CoreEntity';
import { GlobalFilter, Relation } from '../../common/decorators/mvc.decorator';
import { IsNotEmpty } from 'class-validator';
import { UniqueValidate } from '../../common/validators/unique.validator';

export enum GatewayType {
  ZarinPal,
  PayPing,
  Stripe
}
@Relation({
  findAll: ['bank']
})
@Entity({ name: '_gateway' })
export class Gateway extends CoreEntity {
  @IsNotEmpty()
  @UniqueValidate(Gateway)
  @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  @Column({ name: 'title' })
  title: string;

  @ManyToOne(() => Bank)
  @JoinColumn({ name: '_bank_account' })
  bank: Bank;

  @Column({ name: '_token' })
  token: string;

  @Column({ name: '_type', default: GatewayType.ZarinPal })
  type: GatewayType;

  @Column({ name: 'icon', nullable: true })
  icon?: string;

  @Column({ name: 'description', nullable: true })
  description?: string;

  @Column({ name: 'enable', default: true })
  enable: boolean = true;
}
