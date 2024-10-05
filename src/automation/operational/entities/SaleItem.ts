import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId
} from 'typeorm';
import { SaleOrder } from './SaleOrder';
import {
  DefaultSort,
  GlobalFilter,
  Relation
} from '../../../common/decorators/mvc.decorator';
import { User } from '../../../base/entities/User';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { GroupClassRoom } from '../../base/entities/GroupClassRoom';
import { ProductCategory } from '../../base/entities/ProductCategory';
import { ContractorIncome } from './ContractorIncome';
import { OrganizationUnitByFiscalYearBaseEntity } from '../../../base/entities/OrganizationUnitByFiscalYearBaseEntity';
import { Product } from '../../base/entities/Product';
import { Expose, Transform } from 'class-transformer';
import { ServiceReservationTime } from './ServiceReservationTime';
import moment from 'moment';
import { LockerItem } from './LockerItem';
import { Audit } from '../../../common/decorators/audit.decorator';
import { Export } from '../../../common/decorators/export.decorator';

export enum RegisteredServiceStatus {
  opened,
  ReturnFromSale,
  notSettled,
  archived
}

export enum SaleUnitType {
  Product,
  Service,
  Credit,
  Reception,
  Package
}
@Audit()
@Relation({
  findAll: [
    'groupClassRoom',
    'contractor',
    'organizationUnit',
    'user',
    'locker',
    'saleOrder',
    'category',
    'createdBy',
    'consumer',
    { name: 'product', relations: ['category'] }
  ],
  get: [
    'contractor',
    'product',
    'product.priceList',
    'saleUnit',
    'locker',
    'consumer'
  ],
  autoComplete: ['saleOrder', 'groupClassRoom', 'consumer'],
  customFilter: {
    global: (param) => {
      if (Number(param) && param.length < 10) {
        // return Equal(param);
        return `((q.transferCode=${param}) OR (q.id=${param}))`;
      } else {
        return `q.title LIKE '${`%${param}`}%'`;
      }
    }
  }
})
@Export<SaleItem>({
  name: 'saleItem',
  translateKey: 'AUTOMATION_OPT_SALEITEM',
  defaultSelect: ['submitAt', 'status'],
  columns: {
    fiscalYear: {
      transform(obj) {
        return obj?.fiscalYear?.year;
      }
    },
    organizationUnit: {
      transform(obj) {
        return obj?.organizationUnit?.title;
      }
    },
    saleOrder: {
      transform(obj) {
        return obj?.id;
      }
    },
    credit: {
      transform(obj) {
        return obj?.credit;
      }
    },

    product: {
      transform(obj) {
        return obj?.product?.title;
      }
    },
    user: {
      transform(obj) {
        if (obj.user) {
          return `${obj?.user?.firstName} ${obj?.user?.lastName} - ${obj?.user?.code}`;
        }
        return obj.user;
      }
    },
    saleUnit: {
      transform(obj) {
        return obj?.saleUnit?.title;
      }
    },
    category: {
      transform(obj) {
        return obj?.category?.title;
      }
    },
    createdBy: {
      transform(obj) {
        if (obj.createdBy) {
          return `${obj?.createdBy?.firstName} ${obj?.createdBy?.lastName} - ${obj?.createdBy?.code}`;
        }
        return obj.createdBy;
      }
    },
    submitAt: { type: 'datetime' },
    contractor: {
      transform(obj) {
        if (obj.contractor) {
          return `${obj?.contractor?.firstName} ${obj?.contractor?.lastName} - ${obj?.contractor?.code}`;
        }
        return obj.contractor;
      }
    }
  }
})
@Entity({ name: '_sale_item' })
export class SaleItem extends OrganizationUnitByFiscalYearBaseEntity {
  // @GlobalFilter({
  //   where: (param: string) => {
  //     if (Number(param) && param.length < 10) {
  //       return Equal(param);
  //     }
  //   }
  // })
  @Column('unsigned big int', { name: 'id' })
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'int', name: 'transfer_code', nullable: true, unique: true })
  transferCode?: number;

  @Column({ name: 'is_online' })
  isOnline?: boolean;

  @ManyToOne(() => SaleOrder)
  @JoinColumn({ name: 'sale_order', referencedColumnName: 'id' })
  saleOrder: SaleOrder;
  @RelationId((saleItem: SaleItem) => saleItem.saleOrder)
  saleOrderId?: number;
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product', referencedColumnName: 'id' })
  product: Product;
  @RelationId((saleItem: SaleItem) => saleItem.product)
  productId?: number;
  @Column('int', { name: 'type', default: SaleUnitType.Reception })
  type?: SaleUnitType;
  @Column({ name: 'title' })
  // @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  title?: string;
  @Column({ name: 'quantity', default: 1 })
  quantity?: number;
  @Column({ name: 'price', default: 0 })
  price?: number;
  @Column({ name: 'amount', default: 0 })
  amount?: number;
  @Column({ name: 'price_id', nullable: true })
  priceId?: number;
  @Column({ name: 'duration', nullable: true })
  duration?: number;
  @Column({ name: 'manual_price', default: false })
  manualPrice?: boolean;
  @Column({ name: 'unfair_penalty_quantity', default: 0 })
  unFairPenaltyQuantity?: number;
  @Column({ name: 'discount', default: 0, nullable: true })
  discount?: number;
  @Column({ name: 'benefit_contractor_from_penalty', default: true })
  benefitContractorFromPenalty?: boolean;
  @Column({ name: 'default_discount', default: 0, nullable: true })
  defaultDiscount?: number;
  @ManyToOne(() => LockerItem)
  @JoinColumn({ name: 'locker' })
  locker?: LockerItem;
  @RelationId((saleItem: SaleItem) => saleItem.locker)
  lockerId?: number;
  @Column({ name: 'unlimited', default: false })
  unlimited?: boolean = false;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'contractor', referencedColumnName: 'id' })
  contractor: User;
  @Column({ name: 'convert_to_income_after_archived', default: true })
  convertToIncomeAfterArchived?: boolean = true;
  @RelationId((saleItem: SaleItem) => saleItem.contractor)
  readonly contractorId?: number;
  @DefaultSort('DESC')
  @Column('timestamp', { name: 'submit_at', default: new Date() })
  submitAt?: Date;
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user' })
  user: User;
  @RelationId((saleItem: SaleItem) => saleItem.user)
  userId?: number;
  @ManyToOne(() => ProductCategory)
  @JoinColumn({ name: 'category' })
  category?: ProductCategory;
  @RelationId((saleItem: SaleItem) => saleItem.category)
  categoryId?: number;
  @ManyToOne(() => SaleUnit)
  @JoinColumn({ name: 'sale_unit' })
  saleUnit?: SaleUnit;
  @RelationId((saleItem: SaleItem) => saleItem.saleUnit)
  saleUnitId?: number;
  @ManyToOne(() => SaleItem, { nullable: true })
  @JoinColumn({ name: 'registered_service', referencedColumnName: 'id' })
  registeredService: SaleItem;
  @RelationId((saleItem: SaleItem) => saleItem.registeredService)
  registeredServiceId?: number;
  @Column('boolean', { name: 'is_related', default: false })
  related?: boolean = false;
  @Column('boolean', { name: 'is_archived', default: false })
  archived?: boolean = false;
  @Column({ name: 'remain_credit', default: 0 })
  remainCredit?: number;
  @ManyToOne(() => GroupClassRoom)
  @JoinColumn({ name: 'group_class_room', referencedColumnName: 'id' })
  groupClassRoom: GroupClassRoom;
  @RelationId((saleItem: SaleItem) => saleItem.groupClassRoom)
  groupClassRoomId?: number;
  @ManyToOne(() => SaleItem)
  @JoinColumn({ name: 'parent', referencedColumnName: 'id' })
  parent: SaleItem;
  @RelationId((saleItem: SaleItem) => saleItem.parent)
  parentId?: number;
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  consumer?: User;

  @RelationId((saleItem: SaleItem) => saleItem.consumer)
  consumerId?: number;

  @Transform((date1) =>
    date1.value ? moment(date1.value).format('YYYY-MM-DD') : null
  )
  @Column('timestamp', { name: 'start_date', nullable: true })
  start?: Date;
  @Transform((date1) =>
    date1.value ? moment(date1.value).format('YYYY-MM-DD') : null
  )
  @Column('timestamp', { name: 'end_date', nullable: true })
  end?: Date;
  @Column({ name: 'credit', default: 0 })
  credit?: number = 0;
  @Column({ name: 'used_credit', default: 0 })
  usedCredit?: number = 0;
  @Column({ name: 'return_credit', default: 0 })
  returnCredit?: number;
  @Column('timestamp', { name: 'archived_time', nullable: true })
  archivedTime?: Date;
  @Column({ name: 'status', default: RegisteredServiceStatus.opened })
  status?: RegisteredServiceStatus = RegisteredServiceStatus.opened;
  @Column({ name: 'is_transfer', default: false })
  isTransfer?: boolean;
  @Column('boolean', { name: 'with_guest', default: true })
  withGuest?: boolean;
  @Column('float', { name: 'tax', default: 0 })
  tax?: number;
  @Column({ name: 'persons', default: 0 })
  persons?: number;
  @Column({ name: 'description', nullable: true, length: 1024 })
  description?: string;
  @Column({ name: 'is_burn', default: false })
  isBurn?: boolean;
  @Column({ name: 'is_payment_contractor', default: false })
  isPaymentContractor?: boolean;
  @OneToMany(() => ContractorIncome, (object) => object.saleItem, {
    persistence: true,
    cascade: true,
    orphanedRowAction: 'soft-delete'
  })
  contractorIncomes?: ContractorIncome[];
  @OneToMany(() => ServiceReservationTime, (object) => object.saleItem, {
    persistence: true,
    cascade: true,
    orphanedRowAction: 'soft-delete'
  })
  reservationTimes?: ServiceReservationTime[];
  registeredServiceChangeCredit: number = 0;
  groupClassRoomIncrement: number = 0;
  items?: SaleItem[];

  @Column({ name: 'is_gift', default: false })
  isGift?: boolean;

  @Column({ name: 'is_cash_back', default: false })
  isCashBack?: boolean;

  @Column({ name: 'total_delivered', default: 0 })
  totalDelivered?: number;

  @Column('json', { name: 'delivered_items', default: '[]' })
  deliveredItems?: any;

  @Column({ name: 'is_reserve' })
  isReserve: boolean = false;

  @Column({ name: 'reserved_end_time' })
  reservedEndTime?: string;

  @Column({ name: 'reserved_start_time' })
  reservedStartTime?: string;

  @Column({ name: 'reserved_date' })
  reservedDate?: string;

  @Column({ name: 'is_canceled', type: 'boolean' })
  isCanceled?: boolean;

  @ManyToOne(() => User)
  @JoinColumn()
  canceledBy?: User;

  @Column({ name: 'canceled_date' })
  canceledDate: Date;

  @Column({ name: 'event_selected_price_id', default: null })
  eventSelectedPriceId?: number;

  get finalAmountWithoutDiscountAndTax() {
    return Math.round(
      (this.amount || 0) * (this.quantity || 0) - (this.returnCredit || 0)
    );
  }

  get finalAmountWithoutTax() {
    return Math.round(
      (this.amount || 0) * (this.quantity || 0) -
        ((this.discount || 0) + (this.returnCredit || 0))
    );
  }

  @Expose()
  get taxAmount() {
    return Math.round(this.finalAmountWithoutTax * ((this.tax || 0) / 100));
  }

  @Expose()
  get totalAmount() {
    return this.finalAmountWithoutTax + this.taxAmount;
  }

  tryUseCredit(amount: number) {
    if (this.usedCredit + amount >= 0) {
      this.usedCredit += amount;
      return true;
    }
    throw 'Credit not enough';
  }
}
