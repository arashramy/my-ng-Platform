import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  RelationId
} from 'typeorm';
import { User } from '../../../base/entities/User';
import {
  DefaultSort,
  FiscalYearFilter,
  GlobalFilter,
  OrganizationUnitFilter,
  Relation
} from '../../../common/decorators/mvc.decorator';
import { ShiftWork } from '../../../base/entities/ShiftWork';
import { InstallmentLoan } from './InstallmentLoan';
import { OrganizationUnit } from '../../../base/entities/OrganizationUnit';
import { FiscalYear } from '../../../base/entities/FiscalYears';
import { Cheque } from '../../../treasury/entities/Cheque';
import { BailType, Loan } from '../../base/entities/Loan';
import { Document } from '../../../base/entities/Document';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { Audit } from '../../../common/decorators/audit.decorator';
import { Export } from '../../../common/decorators/export.decorator';
import { SaleOrder } from './SaleOrder';

@Audit()
@Relation({
  findAll: [
    {
      name: 'user',
      filtersBy: ['id']
    },
    {
      name: 'items',
      relations: ['transactions']
      
    },
    'organizationUnit',
    'loan',
    'saleUnit',
    'fiscalYear',
  ],
  get: ['user', 'items', 'organizationUnit'],
  autoComplete: []
})
@Export<UserLoan>({
  name: 'userLoan',
  translateKey: 'AUTOMATION_OPT_LOAN',
  columns: {
    user: {
      transform(obj) {
        if (obj.user) {
          return `${obj?.user?.firstName} ${obj?.user?.lastName} - ${obj?.user?.code}`;
        }
        return obj.user;
      }
    },
    remainInstallments: {
      transform: (value: UserLoan) => {
        return value.items?.filter((e) => {
          const paid = e.transactions
            ?.map((e) => e.amount)
            ?.reduce((acc: any, item: any) => acc + +item, 0);
          return paid - e.amount! !== 0;
        })?.length;
      }
    },
    payedTotalAmount: {
      transform: (value: UserLoan) => {
        return value.items
          ?.map((e) =>
            e.transactions
              ?.map((e) => e.amount)
              ?.reduce((acc: any, item: any) => acc + +item, 0)
          )
          ?.reduce((acc, item) => acc + +item, 0);
      }
    },
    totalAmount: {
      transform: (value: UserLoan) =>
        value.amount! -
        value.items
          ?.map((e) =>
            e.transactions
              ?.map((e) => e.amount)
              ?.reduce((acc: any, item: any) => acc + +item, 0)
          )
          ?.reduce((acc, item) => acc + +item, 0)
    },
    loan: {
      transform: (obj: UserLoan) => obj?.loan?.title
    },
    fiscalYear: {
      transform(obj) {
        return obj?.fiscalYear?.year;
      }
    },
    organizationUnit: {
      transform(obj) {
        return obj?.organizationUnit?.title;
      }
    }
  }
})
@Entity({ name: '_user_loan', schema: 'public' })
export class UserLoan extends CoreEntity {
  @ManyToOne(() => Loan)
  @JoinColumn({ name: 'loan' })
  loan?: Loan;
  @RelationId((object: UserLoan) => object.loan)
  loanId?: number;
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user', referencedColumnName: 'id' })
  @GlobalFilter({})
  user: User = null;
  @Column({ name: 'amount', default: 0 })
  amount?: number = 0;
  @Column({ name: 'payed_amount', default: 0 })
  payedAmount?: number = 0;
  @Column({ name: 'interest_rate', default: 0 })
  interestRate?: number = 0;
  @Column({ name: 'late_fees_rate', default: 0 })
  lateFeesRate?: number = 0;
  @Column({ name: 'no_penalty_range' })
  noPenaltyRange?: number = 0;
  @DefaultSort('DESC', 0)
  @Column('timestamptz', { name: 'submit_at', nullable: true })
  submitAt?: Date;
  @Column('integer', { name: 'bail_type', nullable: true })
  bailType: BailType = BailType.User;
  @ManyToOne(() => Cheque)
  @JoinColumn({ name: 'cheque', referencedColumnName: 'id' })
  cheque?: Cheque;
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_bail', referencedColumnName: 'id' })
  userBail?: User;
  @ManyToOne(() => Document)
  @JoinColumn({ name: 'doc' })
  doc?: Document;
  @Column({ name: 'installments' })
  installments?: number;
  @OneToMany(() => InstallmentLoan, (item) => item.loan, {
    cascade: true,
    orphanedRowAction: 'soft-delete',
    persistence: true,
    nullable: true
  })
  items?: InstallmentLoan[];
  @ManyToOne(() => ShiftWork)
  @JoinColumn({ name: 'shift_work', referencedColumnName: 'id' })
  shiftWork: ShiftWork;
  @Column({ name: 'description', nullable: true, length: 1024 })
  description?: string;
  @OrganizationUnitFilter()
  @JoinColumn({ name: 'org_unit' })
  @ManyToOne(() => OrganizationUnit)
  organizationUnit?: OrganizationUnit;
  @RelationId((object: UserLoan) => object.organizationUnit)
  organizationUnitId?: number;
  @JoinColumn({ name: 'sale_unit' })
  @ManyToOne(() => SaleUnit)
  saleUnit?: SaleUnit;
  @RelationId((object: UserLoan) => object.saleUnit)
  saleUnitId?: number;
  @FiscalYearFilter()
  @ManyToOne(() => FiscalYear)
  @JoinColumn({ name: 'fiscal_year' })
  fiscalYear?: FiscalYear;
  @RelationId((object: UserLoan) => object.fiscalYear)
  fiscalYearId?: number;

  // @Column({ name: 'order', type: 'integer', nullable: true })
  @OneToOne(() => SaleOrder, (order) => order.userLoan)
  @JoinColumn({name:'order'})
  order: SaleOrder;

  @Column({ name: 'is_payed', default: false, nullable: true })
  isPayed: boolean = false;
}
