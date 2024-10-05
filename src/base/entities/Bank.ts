import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  Like,
  ManyToMany,
  ManyToOne,
  OneToMany,
  RelationId
} from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { UniqueValidate } from '../../common/validators/unique.validator';
import {
  GlobalFilter,
  OrganizationUnitFilter,
  Relation
} from '../../common/decorators/mvc.decorator';
import { Export } from '../../common/decorators/export.decorator';
import { SaleUnit } from './SaleUnit';
import { OrganizationUnit } from './OrganizationUnit';
import { CoreEntity } from './CoreEntity';
import { PosDevice } from './PosDevice';
import { Audit } from '../../common/decorators/audit.decorator';

export enum BankUsageType {
  Pose,
  Receipt,
  Both
}

@Audit()
@Export<Bank>({
  name: 'Bank',
  translateKey: 'bank',
  columns: {
    enable: {
      transform: (obj) => (obj.enable ? 'bank.Enable' : 'bank.Disable')
    },
    usageType: {
      transform: (obj) =>
        obj.usageType ? 'bank.' + BankUsageType[obj.usageType] : ''
    },
    organizationUnits: {
      transform: (obj) =>
        obj.organizationUnits?.map((ou) => ou?.title).join('\n')
    }
  }
})
@Relation({
  findAll: ['organizationUnits', 'saleUnits', 'pos'],
  get: ['organizationUnits', 'saleUnits', 'pos'],
  autoComplete: ['organizationUnits', 'saleUnits', 'pos'],
  customFilter: {
    organizationUnits: (param) =>
      param
        ? `organizationUnits.id = ${param} OR organizationUnits.id IS NULL`
        : null,
    saleUnits: (param) =>
      param ? `saleUnits.id = ${param} OR saleUnits.id IS NULL` : null
  }
})
@Entity({ name: '_bank', schema: 'public' })
export class Bank extends CoreEntity {
  @IsNotEmpty()
  @UniqueValidate(Bank)
  @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  @Column({ name: 'title' })
  title?: string = '';
  @Column({ name: 'bank' })
  bank?: string = '';
  @Column({ name: 'account_number', nullable: true })
  accountNumber?: string = '';
  @Column({ name: 'cart_number', nullable: true })
  cartNumber?: string = '';
  @Column({ name: 'sheba_number', nullable: true })
  shebaNumber?: string = '';
  @Column({ name: 'usage_type', default: BankUsageType.Both })
  usageType?: BankUsageType = BankUsageType.Both;
  @Column({ name: 'status', default: true })
  enable?: boolean = true;
  @ManyToMany(() => SaleUnit)
  @JoinTable({
    name: '_bank_sale_unit',
    joinColumn: { name: 'bank' },
    inverseJoinColumn: { name: 'sale_unit' }
  })
  saleUnits?: SaleUnit[];
  @OrganizationUnitFilter()
  @JoinTable({
    name: '_bank_org_unit',
    joinColumn: { name: 'bank' },
    inverseJoinColumn: { name: 'org_unit' }
  })
  @ManyToMany(() => OrganizationUnit, {})
  organizationUnits?: OrganizationUnit[] = null;

  @JoinColumn({ name: 'pos_device' })
  @ManyToOne(() => PosDevice)
  pos?: PosDevice;
  @RelationId((bank: Bank) => bank.pos)
  posId?: number;

  @OneToMany(() => SaleUnit, (saleUnit) => saleUnit.defaultBank)
  defaultSelectedSaleUnits: SaleUnit[];
}
