import { Relation } from '../../common/decorators/mvc.decorator';
import { SaleOrder } from '../../automation/operational/entities/SaleOrder';
import { Bank } from '../../base/entities/Bank';
import { CoreEntity } from '../../base/entities/CoreEntity';
import { Gateway } from '../../base/entities/Gateway';
import { User } from '../../base/entities/User';
import { Audit } from '../../common/decorators/audit.decorator';
import { Export } from '../../common/decorators/export.decorator';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

export enum PaymentType {
  Online,
  Receipt
}

export enum PaymentStatus {
  Pending,
  Ok,
  Nok,
  Reject
}

@Audit()
@Relation({
  findAll: ['customer', 'orders', { name: 'gateway', relations: ['bank'] }]
})
@Entity({ name: '_payment' })
@Export<Payment>({
  name: 'Payment',
  translateKey: 'PAYMENT',
  columns: {
    customer: {
      transform: (payment: Payment) =>
        `${payment?.customer?.firstName} ${payment?.customer?.lastName} - ${payment?.customer?.code}`
    },
    bankAccount: {
      transform: (payment: Payment) => `${payment?.bankAccount?.title}`
    },

    type: {
      transform: (payment: Payment) => `PAYMENT.${PaymentType[payment?.type]}`
    },
    status: {
      transform: (payment: Payment) =>
        `PAYMENT.${PaymentStatus[payment?.status]}`
    }
  }
})
export class Payment extends CoreEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: '_user' })
  customer: User;

  @Column({ name: '_start_payment_time', nullable: true })
  startPayment: Date;

  @Column({ name: '_end_payment_time', nullable: true })
  endPayment?: Date;

  @Column({ name: '_receipt_date', nullable: true })
  receiptDate?: Date;

  @Column({ name: '_expired_at', nullable: true })
  expiredAt?: Date;

  @Column({ name: '_amount', nullable: true })
  amount?: number;

  @Column({ name: '_payment_status', default: PaymentStatus.Pending })
  status: PaymentStatus;

  @Column({ name: '_ref_id', nullable: true })
  refId?: string;

  //miration
  @Column({ name: 'code', nullable: true })
  code?: string;

  @Column({ name: 'stripe_id', nullable: true })
  stripeId?: string;

  @Column({ name: '_trace_no', nullable: true })
  traceNo?: string;

  @Column({ name: '_depositor', nullable: true })
  depositor?: string;

  @Column({ name: '_ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: '_agent', nullable: true })
  agent?: string;

  @Column({ name: '_additional_data', nullable: true })
  data?: string;

  @Column({ name: '_callback_url', nullable: true })
  callback?: string;

  @ManyToOne(() => Bank)
  @JoinColumn({ name: '_bank_account' })
  bankAccount?: Bank;

  @JoinColumn({ name: '_gateway' })
  @ManyToOne(() => Gateway)
  gateway: Gateway;

  @Column({ name: '_type' })
  type: PaymentType;

  @Column({ name: '_attachment', nullable: true })
  attachment?: string;

  @Column({ name: 'authority', nullable: true })
  authority?: string;

  @Column({ name: 'card_pan', nullable: true })
  cardPan?: string;

  @Column({ name: 'card_hash', nullable: true })
  cardHash?: string;

  @Column({ name: 'fee', nullable: true })
  fee?: number;

  @OneToMany(() => SaleOrder, (obj) => obj.payment)
  orders: SaleOrder[];

  @Column({ type: 'json', default: null })
  dto?: any = {};

  @Column({ name: 'errors', nullable: true })
  errors?: string;
}
