import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId
} from 'typeorm';
import { User } from '../../../base/entities/User';
import { SaleOrder } from './SaleOrder';
import {
  DefaultSort,
  Relation
} from '../../../common/decorators/mvc.decorator';
import { Export } from '../../../common/decorators/export.decorator';
import { OrganizationUnitByFiscalYearBaseEntity } from '../../../base/entities/OrganizationUnitByFiscalYearBaseEntity';
import { ShiftWork } from '../../../base/entities/ShiftWork';
import { TransactionSourceType } from '../../../base/entities/TransactionSource';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { SaleItem } from './SaleItem';
import { Audit } from '../../../common/decorators/audit.decorator';
import { UserLoan } from './UserLoan';
import { InstallmentLoan } from './InstallmentLoan';
import { Gateway } from '../../../base/entities/Gateway';

export enum TransactionType {
  Deposit,
  Settle,
  Withdraw
}

@Audit()
@Relation({
  findAll: [
    {
      name: 'user',
      filtersBy: ['id']
    },
    {
      name: 'organizationUnit',
      filtersBy: ['id']
    },
    {
      name: 'saleUnit',
      filtersBy: ['id']
    },
    {
      name: 'order',
      filtersBy: ['id']
    },
    {
      name: 'shiftWork',
      filtersBy: ['id']
    },
    {
      name: 'installmentLoan',
      relations: ['cheque'],
      filtersBy: ['id']
    }
  ],
  get: [
    'user',
    'shiftWork',
    'order',
    'organizationUnit',
    'saleUnit',
    'installmentLoan'
  ],
  autoComplete: []
})
@Export<Transaction>({
  name: 'Transactions',
  translateKey: 'AUTOMATION_OPT_TRANSACTIONS',
  defaultSelect: ['amount', 'description'],
  columns: {
    user: {
      transform: (obj) => `${obj.user?.firstName}  ${obj.user?.lastName}`
    },
    type: { transform: (obj) => TransactionType[obj.type] },
    submitAt: { type: 'datetime' },
    Deposit: {
      transform: (value) => {
        return value.amount > 0 ? value.amount : '';
      }
    },
    meta: {
      transform: (obj) => {
        if (!obj?.meta) return '';
        const d = Object.keys(obj.meta).map((e) => {
          if (e && obj.meta[e]) {
            return `${e}${obj.meta[e]}`;
          }
        });
        return d.join(',');
      }
    },
    order: {
      transform: (value) => {
        return value?.order?.id ? `#${value?.order?.id}` : null;
      }
    },
    transactionDescription: {
      transform: (obj) => {
        return obj.description
          ? obj.description
          : obj.installmentLoan
          ? 'تسویه وام'
          : null;
      }
    },
    Withdraw: {
      totalsRowFunction: 'sum',
      transform: (value) => {
        return value.amount <= 0 ? value.amount * -1 : '';
      }
    },
    description: {
      transform: (obj) => {
        return !!obj.description ? obj.description : TransactionType[obj.type];
      }
    },
    DepositTrx: {
      transform: (value) => {
        return value.type === TransactionType.Deposit ||
          value.type === TransactionType.Settle
          ? value.amount
          : 0;
      }
    },
    saleUnit: {
      transform(obj) {
        return obj?.saleUnit?.title;
      }
    },
    organizationUnit: { transform: (obj) => obj?.organizationUnit?.title }
  }
})
@Entity({ name: '_transaction' })
export class Transaction extends OrganizationUnitByFiscalYearBaseEntity {
  @DefaultSort('DESC', 1)
  @Column('unsigned big int', { name: 'id' })
  @PrimaryGeneratedColumn()
  id?: number;
  @Column({ name: 'source_type' })
  sourceType: TransactionSourceType;
  @Column({ name: 'source', nullable: true })
  source?: number;
  @Column({ name: 'title', nullable: true })
  title?: string;
  @Column({ name: 'amount', default: 0, type: 'decimal' })
  amount?: number;
  @Column({ name: 'credit', default: 0, type: 'decimal' })
  credit?: number;
  @Column({ name: 'charge_remain_credit', default: 0, type: 'decimal' }) //وقتایی داده پرمیشود که با استفاده از خدمت شارزی کیف پول شارژ کنیم و اعتبار خدمت شارزیه
  chargeRemainCredit?: number;
  @Column({ name: 'type' })
  type: TransactionType = TransactionType.Deposit;
  @Column({ name: 'description', nullable: true, length: 1024 })
  description?: string = null;
  @Column({ name: 'reference', nullable: true })
  reference?: string;
  @ManyToOne(() => User, { cascade: ['recover'] })
  @JoinColumn({ name: 'user', referencedColumnName: 'id' })
  user: User;
  @RelationId((object: Transaction) => object.user)
  userId: number;
  @ManyToOne(() => SaleOrder, { nullable: true })
  @JoinColumn({ name: 'sale_order', referencedColumnName: 'id' })
  order?: SaleOrder;
  @RelationId((t: Transaction) => t.order)
  orderId?: number;
  @ManyToOne(() => ShiftWork, { nullable: true })
  @JoinColumn({ name: 'shift_work', referencedColumnName: 'id' })
  shiftWork?: ShiftWork;
  @DefaultSort('DESC', 0)
  @Column('timestamptz', { name: 'submit_at', nullable: true })
  submitAt?: Date = new Date();
  @Column({ name: 'is_transfer', default: false })
  isTransfer?: boolean;
  @ManyToOne(() => SaleUnit)
  @JoinColumn({ name: 'sale_unit' })
  saleUnit?: SaleUnit;
  @RelationId((transaction: Transaction) => transaction.saleUnit)
  saleUnitId?: number;
  @Column('json', { name: 'meta', nullable: true })
  meta?: any;
  @ManyToOne(() => InstallmentLoan, { nullable: true })
  @JoinColumn({ name: 'installment', referencedColumnName: 'id' })
  installmentLoan: InstallmentLoan;
  @ManyToOne(() => Gateway)
  @JoinColumn({ name: 'gateway', referencedColumnName: 'id' })
  gateway: Gateway;
  @RelationId((t: Transaction) => t.gateway)
  gatewayId?: number;
}
