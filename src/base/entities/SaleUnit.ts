import {
  Column,
  Entity,
  JoinColumn,
  Like,
  ManyToOne,
  OneToMany,
  RelationId
} from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { GlobalFilter, Relation } from '../../common/decorators/mvc.decorator';
import { Export } from '../../common/decorators/export.decorator';
import { OrganizationUnitBaseEntity } from './OrganizationUnitBaseEntity';
import { Image } from '../dto/image.dto';
import { Location } from './Location';
import { User } from './User';
import { Audit } from '../../common/decorators/audit.decorator';
import { Bank } from './Bank';
import { Printer } from './Printer';
import { UserDescription } from './UserDescription';
import { LockerLocation } from '../../automation/base/entities/LockerLocation';
import { NeedLockerType } from '../../automation/base/entities/Product';
import { SaleUnitType } from '../../automation/operational/entities/SaleItem';



export enum PrintOrderType {
  PrintCafe,
  PrintUser
}

export enum SettleSourceAccess {
  Bank = 1,
  CashDesk = 2,
  Loan = 5,
  Cheque = 6,
  AnotherUser = 10
}

export enum SettleSourcePriority {
  UserCredit = 0,
  Bank = 1,
  CashDesk = 2,
  ChargingService = 3
}



@Audit()
@Relation({
  findAll: [
    'organizationUnit',
    'reception',
    'defaultCustomer',
    { name: 'defaultBank', relations: ['pos'] },
    'defaultPrinter',
    'lockerLocation'
  ],
  get: ['organizationUnit', 'reception', 'defaultCustomer', 'defaultBank','lockerLocation'],
  autoComplete: [],
  customFilter: {
    types: (params) => `q.sale_unit_types::jsonb  @> '${params}'`,
    'types.in': (params) =>
      `q.sale_unit_types::jsonb  @> '[${(Array.isArray(params)
        ? params
        : params.split(',')
      )
        .map((i) => `'${i}'`)
        .join(',')}]'`,
    settleTypes: (params) => `q.settle_types::jsonb  @> '${params}'`,
    'settleTypes.in': (params) =>
      `q.settle_types::jsonb  @> '[${(Array.isArray(params)
        ? params
        : params.split(',')
      )
        .map((i) => `'${i}'`)
        .join(',')}]'`,
    settle: (params) =>
      `q.settle_types::jsonb  @> '${SaleUnitType.Reception}' OR q.allow_settle IS TRUE`
  }
})
@Export<SaleUnit>({
  name: 'SaleUnit',
  translateKey: 'shop',
  columns: {
    image: { type: 'image' },
    organizationUnit: { transform: (obj) => obj.organizationUnit?.title }
  }
})
@Entity({ name: '_sale_unit', synchronize: true })
export class SaleUnit extends OrganizationUnitBaseEntity {
  @IsNotEmpty()
  @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  @Column({ name: 'title' })
  title?: string = '';
  @Column({
    type: 'json',
    name: 'sale_unit_types',
    default: '[]'
  })
  types: SaleUnitType[];
  @JoinColumn({ name: 'location' })
  @ManyToOne(() => Location)
  location?: Location;
  @RelationId((ou: SaleUnit) => ou.location)
  locationId?: number;
  @JoinColumn({ name: 'reception' })
  @ManyToOne(() => SaleUnit)
  reception?: SaleUnit;
  @RelationId((ou: SaleUnit) => ou.reception)
  receptionId?: number;
  @Column({ name: 'settle_force', default: true })
  settleForce: boolean = true;
  @Column({ name: 'allow_discount', default: true })
  allowDiscount?: boolean = true;
  @Column({ name: 'allow_settle', default: false })
  allowSettle?: boolean = false;
  @Column({ name: 'has_locker', default: true })
  hasLocker?: boolean = true;
  @Column({ name: 'auto_assign', default: false })
  autoAssign?: boolean = false;
  @Column({ name: 'auto_assign_policy', default: 'priority' })
  autoAssignPolicy?: string;
  @Column('json', { name: 'settle_types', default: '[]' })
  settleTypes: SettleSourceAccess[];
  @Column('boolean', { name: 'allow_edit_loan_schedules', default: false })
  allowEditLoanSchedules?: boolean = false;
  @Column('json', { name: 'settle_source_priority', default: '[3,0,1,2]' })
  settleSourcePriority?: SettleSourcePriority[];
  @Column('json', {
    name: 'image',
    nullable: true
  })
  image?: Image;

  @Column({ name: 'free_reception', default: true })
  freeReception?: boolean = true;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'default_customer' })
  defaultCustomer?: User;

  @ManyToOne(() => Bank)
  @JoinColumn({ name: 'default_bank' })
  defaultBank: Bank;

  isType(type: SaleUnitType) {
    return this.types?.includes(type);
  }

  @Column({ name: 'print_order_type' })
  printOrderType?: PrintOrderType;

  @Column('int',{ name: 'need_locker', default: NeedLockerType.Unknown })
  needLocker?: NeedLockerType;

  @ManyToOne(() => LockerLocation)
  @JoinColumn({ name: 'locker_location',})
  lockerLocation?: LockerLocation;

  @Column({ name: 'allow_print_order', default: false })
  allowPrintOrder?: boolean = false;

  @Column({ name: 'allow_reception_order', default: false })
  allowPrintReception?: boolean = false;

  @Column({ name: 'as_default', type: 'boolean', default: false })
  asDefault: boolean = false;

  @ManyToOne(() => Printer, { nullable: true })
  defaultPrinter?: Printer;

  @Column({ name: 'is_online', nullable: true })
  isOnline: boolean = false;

  @Column({ name: 'allowed_to_giving_loan', nullable: true })
  allowedToGivingLoan: boolean = false;

  @Column({ name: 'allowed_to_settle_from_others', nullable: true })
  allowedToSettleFromOthers: boolean = false;

  @Column({ name: 'repeatable_traffic', default: false })
  repeatableTraffic?: boolean;

  @OneToMany(
    () => UserDescription,
    (userDescription) => userDescription.saleUnit
  )
  userDescriptions: UserDescription[];
}
