import {Column, Entity, JoinTable, Like, ManyToMany,} from 'typeorm';
import {GlobalFilter, OrganizationUnitFilter, Relation,} from '../../../common/decorators/mvc.decorator';
import {OrganizationUnit} from "../../../base/entities/OrganizationUnit";
import {CoreEntity} from "../../../base/entities/CoreEntity";
import {SaleUnit} from "../../../base/entities/SaleUnit";
import {UniqueValidate} from "../../../common/validators/unique.validator";
import { Audit } from '../../../common/decorators/audit.decorator';

export enum BailType {
   Cheque, BillOfExchange, PaySlip, User
}

@Audit()
@Relation({
  findAll: [],
  get: ['organizationUnits', 'saleUnits'],
  autoComplete: []
})
@Entity({name: '_loan'})
export class Loan extends CoreEntity {
  @UniqueValidate(Loan)
  @GlobalFilter({where: (param: string) => Like(`%${param}%`)})
  @Column({name: 'title'})
  title?: string;
  @Column({name: 'amount', default: 0})
  amount?: number = 0;
  @Column({name: 'interest_rate', default: 0})
  interestRate?: number = 0;
  @Column({name: "late_fees_rate", default: 0})
  lateFeesRate?: number = 0;
  @Column({name: 'no_penalty_range'})
  noPenaltyRange?: number = 0;
  @Column({name: 'free_amount', default: false})
  freeAmount: boolean;
  @Column({name: 'installments'})
  installments: number;
  @Column({name: 'installments_period', default: 30})
  installmentsPeriod: number;
  @Column({name: 'free_installments', default: false})
  freeInstallments: boolean;
  @Column('json', {name: 'bail_types', default: "[]"})
  bailTypes: BailType[];
  @Column({name: 'description', nullable: true, length: 1024})
  description?: string;
  @Column({name: "enabled", default: true})
  enabled?: boolean;
  @OrganizationUnitFilter()
  @ManyToMany(() => OrganizationUnit)
  @JoinTable({name: "_loan_organization_unit", joinColumn: {name: 'loan'}, inverseJoinColumn: {name: 'org_unit'}})
  organizationUnits?: OrganizationUnit[];
  @ManyToMany(() => SaleUnit)
  @JoinTable({name: "_loan_sale_unit", joinColumn: {name: 'loan'}, inverseJoinColumn: {name: 'sale_unit'}})
  saleUnits?: SaleUnit[];
}
