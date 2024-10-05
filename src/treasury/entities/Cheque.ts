import {
  Column,
  Entity,
  Equal,
  JoinColumn,
  JoinTable,
  ManyToOne
} from 'typeorm';
import { User } from '../../base/entities/User';
import {
  FiscalYearFilter,
  GlobalFilter,
  OrganizationUnitFilter,
  Relation
} from '../../common/decorators/mvc.decorator';
import { Document } from '../../base/entities/Document';
import { CoreEntity } from '../../base/entities/CoreEntity';
import { Audit } from '../../common/decorators/audit.decorator';
import { OrganizationUnit } from '../../base/entities/OrganizationUnit';
import { FiscalYear } from '../../base/entities/FiscalYears';
import { SaleUnit } from '../../base/entities/SaleUnit';
import { ShiftWork } from '../../base/entities/ShiftWork';

export enum ChequeStatus {
  Pending,
  Passed,
  Bounced,
  Return
}

@Audit()
@Relation({
  get: ['user', 'doc'],
  findAll: ['user', 'doc'],
  autoComplete: ['user']
})
@Entity({ name: '_cheque', schema: 'public' })
export class Cheque extends CoreEntity {
  @Column({ name: 'bank', nullable: true })
  bank?: string;

  @Column({ name: 'owner', nullable: true })
  owner?: string;

  @Column({ name: 'target', nullable: true })
  target?: string;

  @GlobalFilter({ where: (param) => Equal(param) })
  @Column({ name: 'number', nullable: true })
  number?: string;

  @Column('date', { name: 'date', nullable: true })
  date?: Date;

  @Column({ name: 'amount', nullable: true })
  amount?: number;

  @ManyToOne(() => Document)
  @JoinColumn({ name: 'doc' })
  doc?: Document;

  @Column({ name: 'status', default: ChequeStatus.Pending })
  status?: ChequeStatus = ChequeStatus.Pending;

  @Column({ name: 'description', length: 1024, nullable: true })
  description?: string;

  @ManyToOne(() => User)
  @JoinTable({ name: 'user' })
  user?: User;

  @OrganizationUnitFilter()
  @JoinColumn({ name: 'org_unit' })
  @ManyToOne(() => OrganizationUnit)
  organizationUnit?: OrganizationUnit;

  @JoinColumn({ name: 'sale_unit' })
  @ManyToOne(() => SaleUnit)
  saleUnit?: SaleUnit;

  @FiscalYearFilter()
  @ManyToOne(() => FiscalYear)
  @JoinColumn({ name: 'fiscal_year' })
  fiscalYear?: FiscalYear;

  @ManyToOne(() => ShiftWork)
  @JoinColumn({ name: 'shift_work', referencedColumnName: 'id' })
  shiftWork: ShiftWork;
}
