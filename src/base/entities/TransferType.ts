import { Column, Entity } from 'typeorm';
import { CoreEntity } from './CoreEntity';

export enum paymentType {
  BeforeSale = 1,
  AfterSale = 2
}

@Entity({ name: '_transfer_type' })
export class TransferType extends CoreEntity {
  @Column({ name: 'title' })
  title?: string;

  @Column({ name: 'enable' })
  enable?: boolean = true;

  @Column({ name: 'description', nullable: true })
  description?: string;

  @Column({ name: 'amount', default: 0 })
  amount?: number;

  @Column({ name: 'payment_type', default: paymentType.AfterSale })
  paymentType?: paymentType;

  @Column({ name: 'is_present', default: 0 })
  isPresent?: boolean = false;
}
