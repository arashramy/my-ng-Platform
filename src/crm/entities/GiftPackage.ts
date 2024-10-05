import { Product } from '../../automation/base/entities/Product';
import { CoreEntity } from '../../base/entities/CoreEntity';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne
} from 'typeorm';
import { Gender } from '../../base/entities/User';
import { UserLevel } from './UserLevel';
import { jsonTransformer } from '../../common/typeorm/converter/json-transformer';
import { ProductType } from '../../automation/base/entities/ProductCategory';
import { Relation } from '../../common/decorators/mvc.decorator';

export interface GiftPackageFilter {
  gender: Gender;
  startBirthDate: Date;
  endBirthDate: Date;
  startAge: number;
  endAge: number;
  startRegisteredAt: Date;
  endRegisteredAt: Date;
  isActiveUser: boolean;
  userFirstName: string;
  startUserCredit: number;
  endUserCredit: number;
  inUseGroupClassRoom: number;
  inUseRegisteredService: number;
}

export enum GiftPackageStatus {
  Pending = 'Pending',
  Process = 'Process',
  Success = 'Success',
  Failed = 'Failed'
}

@Relation({ findAll: ['product'], autoComplete: ['product'] })
@Entity({ name: '_gift_package' })
export class GiftPackage extends CoreEntity {
  @Column({ name: 'start_product_at', type: 'timestamp' })
  startProductAt: Date;

  @Column({ name: 'sale_unit_id' })
  saleUnitId: number;

  @Column({ name: 'price_id', default: null })
  productPriceId: number;

  @Column({ name: 'gift_type', default: '' })
  giftType?: ProductType;

  @Column({ name: 'title', type: 'varchar' })
  title: string;

  @Column({ name: 'status', type: 'varchar' })
  status: GiftPackageStatus;

  @Column({ name: 'submit_at', type: 'timestamp' })
  submitAt: Date;

  @ManyToOne(() => Product)
  @JoinColumn({ name: '_gift_package_product' })
  product: Product;

  @ManyToMany(() => UserLevel)
  @JoinTable({ name: '_gitf_package_user_level' })
  customerGroupsFilter: UserLevel[];

  @Column({ name: 'filter', type: 'text', transformer: jsonTransformer })
  filter: GiftPackageFilter;

  @Column({
    name: 'sale_orders',
    type: 'text',
    transformer: jsonTransformer,
    default: '[]'
  })
  saleOrders: { userId: number; orderId: number }[];

  @Column({
    name: 'used_sale_orders',
    type: 'text',
    transformer: jsonTransformer,
    default: '[]'
  })
  usedSaleOrder: { userId: number; orderId: number }[];

  @Column({ name: 'failed_message', default: '' })
  failedMessage: string;
}
