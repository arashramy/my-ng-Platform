import {
  Column,
  Entity,
  EntityManager,
  JoinColumn,
  LessThanOrEqual,
  ManyToOne,
  MoreThanOrEqual,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  RelationId
} from 'typeorm';
import { User } from '../../../base/entities/User';
import { RegisteredServiceStatus, SaleItem, SaleUnitType } from './SaleItem';
import { Transaction } from './Transaction';
import {
  DefaultSort,
  GlobalFilter,
  Relation
} from '../../../common/decorators/mvc.decorator';
import { OrganizationUnitByFiscalYearBaseEntity } from '../../../base/entities/OrganizationUnitByFiscalYearBaseEntity';
import { ShiftWork } from '../../../base/entities/ShiftWork';
import { ReceptionLocker } from './ReceptionLocker';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { LockerItem } from './LockerItem';
import { Audit } from '../../../common/decorators/audit.decorator';
import { Product } from '../../../automation/base/entities/Product';

import {
  ProductCategory,
  ProductType
} from '../../../automation/base/entities/ProductCategory';
import moment from 'moment-jalaali';
import { OrganizationUnit } from '../../../base/entities/OrganizationUnit';
import { FiscalYear } from '../../../base/entities/FiscalYears';
import { Import } from '../../../common/decorators/import.decorator';
import { Project } from '../../../project-management/operational/entities/Project';
import { Location } from '../../../base/entities/Location';
import { TransferType } from '../../../base/entities/TransferType';
import { Export } from '../../../common/decorators/export.decorator';
import { Event } from '../../../automation/base/entities/Event';
import { Payment } from '../../../payment/entities/payment.entity';
import { UserLoan } from './UserLoan';

export enum SaleType {
  Sale = 1,
  PreSale = 2
}

export enum SaleStatus {
  NotTransmitted = 1,
  Transmitted = 2,
  Canceled = 3
}

export enum SentToTaxStatus {
  NotSent = 0,
  Sending = 1,
  Sent = 2,
  Failed = 3
}

@Audit()
@Import<SaleOrder>({
  columns: {
    saleUnitId: {
      validator: async (value) => {
        return !value || /^\d*$/.test(value);
      },
      validatorMessage: 'Invalid sale unit id',
      priority: 0,
      sample: 'Sale unit id'
    },
    productId: {
      validator: async (value) => {
        return !value || /^\d*$/.test(value);
      },
      validatorMessage: 'Invalid product id',
      priority: 0,
      sample: 'Product id'
    },
    userCode: {
      validator: async (value) => {
        return !value || /^\d*$/.test(value);
      },
      validatorMessage: 'Invalid code',
      priority: 1,
      sample: 'code character numbers'
    },
    expiredAt: {
      transform: async (value) => {
        const date = moment(value, 'jYYYY-jMM-jDD');
        if (date.isValid()) {
          return date.format('YYYY-MM-DD');
        }
        return null;
      },
      priority: 2,
      sample: 'expired date is persian date example:1402-01-01'
    },
    credit: {
      validator: async (value) => {
        return !value || /^\d*$/.test(value);
      },
      validatorMessage: 'Invalid credit',
      priority: 3,
      sample: 'Credit character numbers'
    },
    transferCode: {
      priority: 4,
      sample: 'transfer code'
    }
  },
  validator: async (value: any, em: EntityManager) => {
    console.log('validator', value);
    if (
      !value.credit ||
      !value.userCode ||
      !value.productId ||
      !value.expiredAt ||
      !value.saleUnitId
    ) {
      return false;
    }
    value.saleUnit = await em.findOne(SaleUnit, {
      where: { id: value.saleUnitId },
      cache: 300000
    });
    if (!value.saleUnit) {
      return false;
    }

    value.product = await em.findOne(Product, {
      where: { id: value.productId },
      cache: 300000
    });
    if (!value.product) {
      return false;
    }

    value.user = await em.findOne(User, {
      where: { code: value.userCode },
      cache: 300000
    });
    if (!value.user) {
      return false;
    }
    value.shiftWork = [
      ...(await ShiftWork.find({ take: 1, cache: 300000 }))
    ]?.shift();
    if (!value.shiftWork) {
      return false;
    }
    value.fiscalYear = await FiscalYear.findOne({
      where: {
        start: LessThanOrEqual(new Date()),
        end: MoreThanOrEqual(new Date())
      },
      cache: 300000
    });

    return true;
  },
  validatorMessage:
    'invalid parameters sale unit id/product id/user code/credit/expired time/shift work',
  prepareModel: async (value: any, em: EntityManager) => {
    const order = new SaleOrder();
    order.saleUnit = value.saleUnit;
    order.organizationUnit = {
      id: order.saleUnit?.organizationUnitId
    } as OrganizationUnit;
    order.shiftWork = value.shiftWork;
    order.fiscalYear = value.fiscalYear;
    order.submitAt = new Date();
    order.user = value.user;
    order.reception = false;
    order.archived = false;
    order.discount = 0;
    order.saleType = SaleType.PreSale;
    order.discount = 0;
    order.totalAmount = 0;
    order.tax = 0;
    order.settleAmount = 0;
    order.start = new Date();
    order.meta = value.product.title;
    order.isTransfer = true;
    const saleItem = {
      fiscalYear: order.fiscalYear,
      submitAt: new Date(),
      user: order.user,
      organizationUnit: order.organizationUnit,
      saleUnit: order.saleUnit,
      product: value.product,
      title: value.product.title,
      category: { id: value.product.categoryId } as ProductCategory,
      type:
        value.product?.type == ProductType.Service
          ? SaleUnitType.Service
          : SaleUnitType.Credit,
      manualPrice: false,
      isTransfer: true,
      status: RegisteredServiceStatus.opened,
      withGuest: value.product?.withGuest,
      persons: 0,
      transferCode: value?.transferCode,
      related: value.product.related,
      unlimited:
        value.product?.type == ProductType.Service
          ? value.product.unlimited
          : false,
      defaultDiscount: 0,
      start: moment().subtract(1, 'day').format('YYYY/MM/DD') as any,
      end: value.expiredAt,
      quantity: 1,
      duration: moment(value.expiredAt).diff(moment(), 'days'),
      credit:
        value.product?.type == ProductType.Service
          ? value.product.unlimited
            ? 1000000000
            : value.credit
          : value.credit,
      usedCredit: 0,
      price: 0,
      amount: 0,
      discount: 0,
      tax: 0,
      remainCredit: value.credit,
      archived: false
    } as SaleItem;

    order.items = [await SaleItem.save(saleItem)];
    return order;
  }
})
@Export<SaleOrder>({
  name: 'order',
  translateKey: 'AUTOMATION_OPT_ORDERS',
  columns: {
    updatedBy: {
      transform(obj: SaleOrder) {
        if (obj.updatedBy) {
          return `${obj?.updatedBy?.firstName} ${obj?.updatedBy?.lastName} - ${obj?.updatedBy?.code}`;
        }
        return obj.updatedBy;
      }
    },
    createdBy: {
      transform(obj: SaleOrder) {
        if (obj.createdBy) {
          return `${obj?.createdBy?.firstName} ${obj?.createdBy?.lastName} - ${obj?.createdBy?.code}`;
        }
        return obj.createdBy;
      }
    },
    saleUnit: {
      transform(obj: SaleOrder) {
        return obj.saleUnit.title;
      }
    },
    location: {
      transform(obj: SaleOrder) {
        return obj?.location?.title;
      }
    },
    organizationUnit: {
      transform(obj: SaleOrder) {
        return obj?.organizationUnit?.title;
      }
    },
    fiscalYear: {
      transform(obj: SaleOrder) {
        return obj?.fiscalYear?.year;
      }
    },
    user: {
      transform(obj: SaleOrder) {
        // console.log(obj);
        return `${obj?.user?.firstName} ${obj?.user?.lastName} - ${obj?.user?.code}`;
      }
    },
    start: {
      transform(obj: SaleOrder) {
        return `${obj?.user?.firstName} ${obj?.user?.lastName} - ${obj?.user?.code}`;
      }
    },
    items: {
      transform(obj) {
        return obj?.items.map((e) => e?.title).join(',');
      }
    },
    usergroups: {
      transform(obj) {
        return obj?.user?.groups.map((e) => e?.title).join(',');
      }
    },
    vipLocker: {
      transform(obj) {
        return obj?.vipLocker?.lockerNumber;
      }
    },
    receptionAmount: {
      transform(obj) {
        return obj?.totalAmount;
      }
    },
    totalAmountWithoutDiscount: {
      transform(obj) {
        const totalAmount = obj.items
          ?.filter((item) => !item.deletedAt && !item.parentId && !item.parent)
          ?.map((item) => item.totalAmount)
          .reduce((a, b) => (a || 0) + (b || 0), 0);

        return totalAmount + obj?.discount;
      }
    }
  }
})
@Relation({
  findAll: [
    'event',
    'productCategory',
    {
      name: 'user',
      filtersBy: ['id'],
      relations: ['groups']
    },
    'organizationUnit',
    'saleUnit',
    'location',
    {
      name: 'items',
      relations: ['registeredService', 'groupClassRoom', 'product']
    },
    'updatedBy',
    'createdBy',
    'vipLocker',
    { name: 'normalSaleOrder', relations: ['transactions'] },
    { name: 'parentSubProductOrders', relations: ['items'] }
  ],
  get: [
    'user',
    'lockers',
    'location',
    'items',
    'organizationUnit',
    'saleUnit',
    'items.product',
    'vipLocker',
    'items.product.contractors',
    'items.product.contractors.contractor',
    'items.product.priceList',
    'items.registeredService',
    'items.contractor',
    'transactions',
    'transactions.user',
    'items.locker',
    'createdBy',
    'normalSaleOrder',
    'normalSaleOrder.transactions',
    'normalSaleOrder.items',
    'normalSaleOrder.items.product',
    'normalSaleOrder.user',
    'subProductOrders',
    'subProductOrders.items',
    'parentSubProductOrders'
  ],
  autoComplete: ['items.contractor'],
  customFilter: {
    by_access: (param) =>
      `(saleUnit.id IN (${param}) OR saleUnit.reception_unit IN (${param}))`
  }
})
@Entity({ name: '_sale_order', synchronize: true })
export class SaleOrder extends OrganizationUnitByFiscalYearBaseEntity {
  @DefaultSort('DESC', 1)
  @Column('unsigned big int', { name: 'id' })
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'json', default: null })
  dto?: any;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string = '';

  @Column({ name: 'is_canceled', type: 'boolean' })
  isCanceled?: boolean;

  @Column({ name: 'pre_settle_source_id', nullable: true })
  preSettleSourceId?: number;

  @ManyToOne(() => User)
  @JoinColumn()
  canceledBy?: User;

  @Column({ name: 'canceled_date' })
  canceledDate: Date;

  @ManyToOne(() => User)
  @JoinColumn()
  sentToTaxBy?: User;

  @Column({ name: 'sent_to_tax_date' })
  sentToTaxDate?: Date;

  // @Column({ name: 'is_sent_to_tax', default: false })
  // isSentToTax?: boolean;

  @Column({ name: 'sent_to_tax_status', default: SentToTaxStatus.NotSent })
  sentToTaxStatus?: SentToTaxStatus;

  @Column('bigint', { name: 'sale_order_reception_id' })
  saleOrderReceptionId: number;

  @Column({ name: 'invoice_no', nullable: true })
  invoiceNo?: number;
  @ManyToOne(() => User)
  @JoinColumn({ name: '_user', referencedColumnName: 'id' })
  @GlobalFilter({})
  user: User;

  @ManyToOne(() => Location)
  @JoinColumn({ name: '_location', referencedColumnName: 'id' })
  @GlobalFilter({})
  location: Location;

  @Column({ name: 'tax_error', nullable: true })
  taxErrors?: string;

  @RelationId((object: SaleOrder) => object.user)
  userId?: number;
  @Column({ name: 'credit', default: 0 })
  credit?: number = 0;
  @Column({ name: 'reception', default: false })
  reception?: boolean = false;
  @Column({ name: 'settle_amount', default: 0 })
  settleAmount?: number = 0;
  @DefaultSort('DESC', 0)
  @Column('timestamptz', { name: 'submit_at', nullable: true })
  submitAt?: Date;
  @ManyToOne(() => LockerItem)
  @JoinColumn({ name: 'locker_vip', referencedColumnName: 'id' })
  vipLocker: LockerItem;
  @RelationId((obj: SaleOrder) => obj.vipLocker)
  vipLockerId?: number;
  @OneToMany(() => SaleItem, (saleItem) => saleItem.saleOrder, {
    cascade: true,
    orphanedRowAction: 'soft-delete',
    persistence: true,
    nullable: true
  })
  items?: SaleItem[];
  @ManyToOne(() => ShiftWork)
  @JoinColumn({ name: 'shift_work', referencedColumnName: 'id' })
  shiftWork: ShiftWork;
  @RelationId((obj: SaleOrder) => obj.shiftWork)
  shiftWorkId?: number;
  @ManyToOne(() => SaleUnit)
  @JoinColumn({ name: 'sale_unit', referencedColumnName: 'id' })
  saleUnit?: SaleUnit;
  @RelationId((obj: SaleOrder) => obj.saleUnit)
  saleUnitId?: number;
  @OneToMany(() => ReceptionLocker, (object) => object.reception, {
    cascade: true,
    orphanedRowAction: 'soft-delete',
    persistence: true,
    nullable: true
  })
  lockers: ReceptionLocker[];
  @Column('timestamptz', { name: 'start_date', default: () => 'now()' })
  start: Date = null;
  @Column('timestamptz', { name: 'end_date', nullable: true })
  end: Date = null;
  @Column({ name: 'archived', default: false })
  archived: boolean = false;
  @Column({ name: 'is_burn', default: false })
  isBurn?: boolean;
  @OneToMany(() => Transaction, (object) => object.order, {
    cascade: ['soft-remove'],
    persistence: false
  })
  transactions?: Transaction[];
  @Column({ name: 'meta', nullable: true })
  meta?: string;
  @Column({ name: 'tax', default: 0 })
  tax?: number;
  @Column({ name: 'discount', default: 0 })
  discount?: number;
  @Column({ name: 'total_amount', default: 0 })
  totalAmount?: number;
  @Column({ name: 'quantity', default: 0 })
  quantity?: number;

  @Column({ name: 'sale_type', default: SaleType.Sale })
  saleType?: SaleType;

  @Column({ name: 'created_by_device', type: 'bool', default: false })
  isCreatedByDevice?: boolean;

  @Column({ name: 'is_gift', default: false })
  isGift: boolean;

  @Column({
    name: 'sale_status',
    enum: SaleStatus,
    default: SaleStatus.NotTransmitted
  })
  saleStatus?: SaleStatus = SaleStatus.NotTransmitted;

  @ManyToOne(() => Project, (object) => object.id)
  @JoinColumn({ name: 'project', referencedColumnName: 'id' })
  project?: Project;

  @ManyToOne(() => TransferType, (object) => object.id)
  @JoinColumn({ name: 'transfer_type', referencedColumnName: 'id' })
  transferType?: TransferType;

  @Column({ name: 'user_order_locker', type: 'int', nullable: true })
  userOrderLocker?: number;

  @ManyToOne(() => SaleOrder)
  receptionSaleOrder: SaleOrder;

  @Column('boolean', { name: 'is_transfer' })
  isTransfer?: boolean = false;

  @OneToMany(() => SaleOrder, (saleOrder) => saleOrder.receptionSaleOrder)
  normalSaleOrder: SaleOrder[];

  @Column({ name: 'is_reserve' })
  isReserve: boolean = false;

  @OneToMany(() => SaleOrder, (saleOrder) => saleOrder.parentSubProductOrders)
  subProductOrders: SaleOrder[];

  @ManyToOne(() => SaleOrder, (saleOrder) => saleOrder.subProductOrders)
  @JoinColumn()
  parentSubProductOrders: SaleOrder;

  @OneToOne(() => UserLoan, (userLoan) => userLoan.order)
  userLoan: number;

  @ManyToOne(() => Event)
  @JoinColumn()
  event: Event;

  @ManyToOne(() => ProductCategory)
  @JoinColumn()
  productCategory: ProductCategory;

  @JoinColumn({ name: '_payment' })
  @ManyToOne(() => Payment)
  payment?: Payment;

  @ManyToOne(() => SaleOrder)
  @JoinColumn({ name: 'cash_back_parent' })
  cashBackParent?: SaleOrder;
  @RelationId((obj: SaleOrder) => obj.cashBackParent)
  cashBackParentId?: number;

  get totalDiscount() {
    return this.items
      ?.filter((item) => !item.deletedAt && !item.parentId && !item.parent)
      ?.map((item) => item.discount || 0)
      .reduce((a, b) => (a || 0) + (b || 0), 0);
  }

  get totalTax() {
    return this.items
      ?.filter((item) => !item.deletedAt && !item.parentId && !item.parent)
      ?.map((item) => item.taxAmount)
      .reduce((a, b) => (a || 0) + (b || 0), 0);
  }

  get getTotalAmount() {
    return this.items
      ?.filter((item) => !item.deletedAt && !item.parentId && !item.parent)
      ?.map((item) => item.amount)
      .reduce((a, b) => (a || 0) + (b || 0), 0);
  }

  get finalAmount() {
    return this.items
      ?.filter((item) => !item.deletedAt && !item.parentId && !item.parent)
      ?.map((item) => item.totalAmount)
      .reduce((a, b) => (a || 0) + (b || 0), 0);
  }

  get balance() {
    return this.finalAmount - (this.settleAmount || 0);
  }
}
