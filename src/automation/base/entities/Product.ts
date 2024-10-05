import {
  Column,
  Entity,
  Equal,
  JoinColumn,
  JoinTable,
  Like,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  RelationId
} from 'typeorm';
import { ProductCategory, ProductType } from './ProductCategory';
import {
  GlobalFilter,
  Relation
} from '../../../common/decorators/mvc.decorator';
import { IsNotEmpty } from 'class-validator';
import { UniqueValidate } from '../../../common/validators/unique.validator';
import { Export } from '../../../common/decorators/export.decorator';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { Image } from '../../../base/dto/image.dto';
import { Unit } from '../../../base/entities/Unit';
import { ProductPrice } from './ProductPrice';
import { ProductContractor } from './ProductContractor';
import { ProductSchedule } from './ProductSchedule';
import { SubProduct } from './SubProduct';
import {  SaleUnit } from '../../../base/entities/SaleUnit';
import { ProductPartner } from './ProductPartner';
import moment from 'moment';
import { Audit } from '../../../common/decorators/audit.decorator';
import { jsonTransformer } from '../../../common/typeorm/converter/json-transformer';
import { GiftPackage } from '../../../crm/entities/GiftPackage';
import { Printer } from '../../../base/entities/Printer';
import { ProductTag } from './ProductTag';
import { ReservePattern } from './ReservePattern';
import { CancelReservation } from '../dto/cancel-reservation.dto';
import { LockerLocation } from './LockerLocation';

export enum ArchivedType {
  Expired,
  All,
  None
}

export enum ProductAlarmType {
  expiresTimeAlarm = 'expiresTimeAlarm',
  remainCreditAlarm = 'remainCreditAlarm'
}

export enum ProductAlarmColor {
  red = 'red',
  green = 'green',
  yellow = 'yellow',
  purple = 'purple'
}

export interface ProductAlarm {
  key: string;
  value: string;
  color: ProductAlarmColor;
  type: ProductAlarmType;
}

export enum ArchivedContractorIncomeType {
  AccordanceUsed,
  NoChange,
  Custom
}

export enum NeedLockerType {
  Yes,
  No,
  Unknown
}


// export enum SaleUnitType {
//   Product,
//   Service,
//   Credit,
//   Reception,
//   Package
// }

export enum ActionAfterUnfairUsageTime {
  Exit,
  Penalty
}

@Audit()
@Relation({
  findAll: [
    'unit',
    'category',
    'priceList',
    'contractors',
    'defaultPrinter',
    'tagProducts',
    'reportTag',
    'reservationPattern',
    'authorizedSalesUnits',
    'authorizedDeliveryUnits',
    'tagProductParent',
    'lockerLocation'
  ],
  get: [
    'unit',
    'category',
    'priceList',
    'partners',
    'partners.user',
    'contractors',
    'contractors.contractor',
    'subProducts',
    'subProducts.product',
    'subProducts.category',
    'subProducts.organizationUnit',
    'subProducts.saleUnit',
    'subProducts.contractor',
    'subProducts.price',
    'authorizedSalesUnits',
    'authorizedDeliveryUnits',
    'schedules',
    'tagProducts',
    'reservationPattern',
    'tagProductParent',
    'lockerLocation'
  ],
  autoComplete: [
    'category',
    'unit',
    'priceList',
    'authorizedSalesUnits',
    'reservationPattern'
  ],
  customFilter: {
    authorizedSalesUnits: (param) =>
      `(authorizedSalesUnits.id IS NULL OR authorizedSalesUnits.id = ${param})`
  }
})
@Export<Product>({
  name: 'Product',
  translateKey: 'product',
  columns: {
    image: { type: 'image' },
    category: { transform: (obj) => obj.category.title }
  }
})
@Entity({ name: '_product'})
export class Product extends CoreEntity {
  @IsNotEmpty()
  @UniqueValidate(Product)
  @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  @Column({ name: 'title' })
  title?: string = '';

  @IsNotEmpty()
  @UniqueValidate(Product)
  @GlobalFilter({ where: (param: string) => Equal(param) })
  @Column({ name: 'sku', nullable: true })
  sku?: string = '';
  @Column({ type: 'int', name: 'sale_unit', default: ProductType.Product })
  type?: ProductType;

  @Column('json', {
    name: 'image',
    nullable: true
  })
  image?: Image;

  @IsNotEmpty()
  @Column({ name: 'price', default: 0 })
  price?: number = 0;

  @Column({ name: 'discount', default: 0 })
  discount?: number = 0;

  @Column({ name: 'transferable_to_wallet', default: false })
  transferableToWallet?: boolean;

  @Column({ name: 'status', default: true })
  status?: boolean = true;

  @Column({ name: 'is_locker', default: false })
  isLocker?: boolean = false;

  @Column('int',{ name: 'need_locker', default: NeedLockerType.Unknown  })
  needLocker?: NeedLockerType;

  @ManyToOne(() => LockerLocation)
  @JoinColumn({ name: 'locker_location', referencedColumnName: 'id' })
  lockerLocation?: LockerLocation;

  @Column({ name: 'unlimited', default: false })
  unlimited?: boolean = false;

  @Column({ name: 'description', nullable: true })
  description?: string;

  @Column({ name: 'tax_system_description', nullable: true })
  taxSystemDescription?: string;

  @Column({ name: 'unique_tax_code', type: 'text', nullable: true })
  uniqueTaxCode?: string;

  @Column({ name: 'benefit_contractor_from_penalty', default: false })
  benefitContractorFromPenalty?: boolean;

  @Column('boolean', { name: 'is_related', default: false })
  related?: boolean = false;

  @Column('int', { name: 'action_after_unfair_usageTime', default: ActionAfterUnfairUsageTime.Penalty })
  actionAfterUnfairUsageTime?: ActionAfterUnfairUsageTime;

  @Column('float', { name: 'tax', default: 0 })
  tax?: number = 0;

  @Column({ name: 'capacity', default: 0 })
  capacity?: number = 0;

  @Column({ name: 'reserve_capacity', default: 0 })
  reserveCapacity?: number = 0;

  @Column({ name: 'reservable', default: false })
  reservable: boolean = false;

  @Column({ name: 'duration', default: 0 })
  duration: number = 0;

  @Column({ name: 'manual_price', default: false })
  manualPrice?: boolean;

  @Column({ name: 'archived_type', default: ArchivedType.None })
  archivedType?: ArchivedType;

  @Column({
    name: 'metadata',
    type: 'text',
    transformer: jsonTransformer,
    nullable: true
  })
  metadata?: any;

  @Column({ name: 'archived_penalty_amount', default: 0 })
  archivedPenaltyAmount: number = 0;

  @Column({ name: 'convert_to_income_after_days', default: 0 })
  convertToIncomeAfterDays?: number = 0;

  @Column({ name: 'archived_contractor_income_type', default: false })
  archivedContractorIncomeType?: boolean;

  @Column({
    name: 'reservation_penalty',
    type: 'text',
    transformer: jsonTransformer,
    default: '[]'
  })
  reservationPenalty: CancelReservation[];

  @IsNotEmpty()
  @GlobalFilter({
    where(param) {}
  })
  @ManyToOne(() => ProductCategory, { orphanedRowAction: 'soft-delete' })
  @JoinColumn({ name: 'category', referencedColumnName: 'id' })
  category?: ProductCategory;
  @RelationId((p: Product) => p.category)
  categoryId?: number;
  @ManyToOne(() => Unit, { orphanedRowAction: 'soft-delete' })
  @JoinColumn({ name: 'unit', referencedColumnName: 'id' })
  unit?: Unit;

  @Column('boolean', { name: 'allow_comment', default: true })
  allowComment?: boolean;

  @Column('boolean', { name: 'with_guest', default: true })
  withGuest?: boolean;

  @Column({ name: 'fair_use_time', default: -1 })
  fairUseTime?: number;

  @Column({ name: 'fair_use__limit_time', default: -1 })
  fairUseLimitTime?: number;

  @Column({ name: 'fair_use_amount_formula', nullable: true })
  fairUseAmountFormula?: string;

  @Column({ name: 'unfair_use_amount', default: 0 })
  unfairUseAmount?: number;

  @Column({ name: 'has_price_list', default: false })
  hasPriceList?: boolean;
  @OneToMany(() => ProductPrice, (price) => price.product, {
    cascade: true,
    orphanedRowAction: 'soft-delete',
    persistence: true,
    nullable: true
  })
  priceList?: ProductPrice[];

  @Column({ name: 'has_contractor', default: false })
  hasContractor?: boolean = false;

  @Column({ name: 'required_contractor', default: false })
  requiredContractor?: boolean = false;

  @OneToMany(
    () => ProductContractor,
    (serviceContractor) => serviceContractor.product,
    {
      cascade: true,
      orphanedRowAction: 'soft-delete',
      persistence: true,
      nullable: true
    }
  )
  contractors?: ProductContractor[] = null;

  @Column({ name: 'has_partner', default: false })
  hasPartner?: boolean = false;

  @OneToMany(() => ProductPartner, (partner) => partner.product, {
    cascade: true,
    orphanedRowAction: 'soft-delete',
    persistence: true,
    nullable: true
  })
  partners?: ProductPartner[] = null;

  @Column({ name: 'has_schedules', default: false })
  hasSchedules?: boolean;
  @OneToMany(() => ProductSchedule, (schedule) => schedule.product, {
    cascade: true,
    orphanedRowAction: 'soft-delete',
    persistence: true,
    nullable: true
  })
  schedules?: ProductSchedule[];

  @Column({ name: 'has_sub_product', default: false })
  hasSubProduct?: boolean;
  @OneToMany(() => SubProduct, (subProduct) => subProduct.parent, {
    cascade: true,
    orphanedRowAction: 'soft-delete',
    persistence: true,
    nullable: true
  })
  subProducts?: SubProduct[];

  @ManyToMany(() => SaleUnit, { orphanedRowAction: 'soft-delete' })
  @JoinTable({
    name: '_authorized_sales_units',
    joinColumn: { name: 'product' },
    inverseJoinColumn: { name: 'sale_unit' }
  })
  authorizedSalesUnits: SaleUnit[];

  @ManyToMany(() => SaleUnit, { orphanedRowAction: 'soft-delete' })
  @JoinTable({
    name: '_authorized_delivery_units',
    joinColumn: { name: 'product' },
    inverseJoinColumn: { name: 'sale_unit' }
  })
  authorizedDeliveryUnits: SaleUnit[];

  @Column({ name: 'alarms', type: 'text', transformer: jsonTransformer })
  alarms: ProductAlarm[] = [];

  @Column({ name: 'is_insurance_service' })
  isInsuranceService: boolean;

  @Column({ name: 'is_subscription_service' })
  isSubscriptionService: boolean;

  @Column({ name: 'is_gift', default: false })
  isGift: boolean;

  @OneToMany(() => GiftPackage, (giftPackage) => giftPackage.product)
  giftPackages: GiftPackage;

  @Column({ name: 'is_cash_back', default: false })
  isCashBack?: boolean;

  @Column({ name: 'must_sent_to_tax', default: true })
  mustSentToTax?: boolean = true;

  @Column({ name: 'reception_auto_print', default: false })
  receptionAutoPrint?: boolean;

  @Column({ name: 'is_gift_generator', default: false })
  isGiftGenerator: boolean;

  @Column({ name: 'transfer_amount', default: 0 })
  transferAmount: number;

  @ManyToOne(() => Printer, { nullable: true })
  defaultPrinter?: Printer;

  @OneToMany(() => Product, (product) => product.tagProductParent, {
    cascade: true,
    persistence: true,
    nullable: true
  })
  tagProducts: Product[];

  @ManyToOne(() => ReservePattern, (reserve) => reserve.products)
  @JoinColumn({ name: 'reserve', referencedColumnName: 'id' })
  reservationPattern: ReservePattern;

  @ManyToOne(() => Product, (product) => product.tagProducts)
  @JoinColumn({ name: 'tagProductParent', referencedColumnName: 'id' })
  tagProductParent: Product;

  @Column({ name: 'include_sms', default: true })
  includeSms: boolean = true;

  @Column({ name: 'default_sms_template', default: '' })
  defaultSmsTemplate?: string;

  @ManyToOne(() => ProductTag, (product) => product.products)
  @JoinColumn({ name: 'reportTag', referencedColumnName: 'id' })
  reportTag: ProductTag;

  availableProductInTime(submitAt: Date) {
    if (this.hasSchedules) {
      let current = submitAt ? moment(submitAt) : moment();
      let day = current.isoWeekday();
      let currentTime = moment(current.format('HH:mm:ss'), 'HH:mm:ss');
      return this.schedules?.some((sc) => {
        return (
          sc.days.includes(day) &&
          moment(sc.from, 'HH:mm:ss').isSameOrBefore(currentTime, 'minute') &&
          moment(sc.to, 'HH:mm:ss').isSameOrAfter(currentTime, 'minute')
        );
      });
    } else {
      return true;
    }
  }

  findScheduleInTime(submitAt: Date) {
    if (this.hasSchedules) {
      let current = submitAt ? moment(submitAt) : moment();
      let day = current.isoWeekday();
      let currentTime = moment(current.format('HH:mm:ss'), 'HH:mm:ss');
      return this.schedules?.find((sc) => {
        return (
          sc.days.includes(day) &&
          moment(sc.from, 'HH:mm:ss').isSameOrBefore(currentTime, 'minute') &&
          moment(sc.to, 'HH:mm:ss').isSameOrAfter(currentTime, 'minute')
        );
      });
    } else {
      return null;
    }
  }
}
