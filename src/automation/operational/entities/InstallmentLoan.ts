import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  RelationId
} from 'typeorm';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { Relation } from '../../../common/decorators/mvc.decorator';
import { UserLoan } from './UserLoan';
import { Transaction } from './Transaction';
import { Cheque } from '../../../treasury/entities/Cheque';

@Relation({
  findAll: ['transactions']
})
@Entity({ name: '_installment_loan' })
export class InstallmentLoan extends CoreEntity {
  @ManyToOne(() => UserLoan)
  @JoinColumn({ name: 'loan', referencedColumnName: 'id' })
  loan: UserLoan;

  @Column({ name: 'amount', default: 0 })
  amount?: number;

  @Column({ name: 'penalty_amount', default: 0 })
  penaltyAmount?: number;

  @OneToMany(() => Transaction, (t) => t.installmentLoan)
  transactions?: Transaction[];

  @ManyToOne(() => Cheque)
  @JoinColumn({ name: 'cheque', referencedColumnName: 'id' })
  cheque?: Cheque;

  @RelationId((object: InstallmentLoan) => object.cheque)
  chequeId?: number;

  @Column({ name: 'payed_time', nullable: true })
  payedTime?: Date;

  @Column({ name: 'pay_time' })
  payTime?: Date;

  @Column({ name: 'description', nullable: true })
  description?: string;

  @Column({ name: 'notification', default: 0 })
  notification?: number;
}
