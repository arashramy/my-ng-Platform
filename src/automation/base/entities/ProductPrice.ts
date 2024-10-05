import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { Product } from './Product';
import { jsonTransformer } from '../../../common/typeorm/converter/json-transformer';

@Entity({ name: '_product_price' })
export class ProductPrice extends CoreEntity {
  @Column({ name: 'title', nullable: true })
  title?: string;
  @Column('int', { name: 'min', default: 0 })
  min?: number;
  @Column('int', { name: 'max', default: 0 })
  max: number;

  @Column('int', { name: 'duration', default: 0 })
  duration: number;
  @Column({ name: 'price', default: 0 })
  price: number;
  @Column({ name: 'credit', default: 0 })
  credit: number;
  @ManyToOne(() => Product, (product) => product.priceList)
  @JoinColumn({ name: 'product', referencedColumnName: 'id' })
  product: Product;

  @Column({ name: 'cash_back_percentage', type: 'int' })
  cashBackPercentage: number;

  @Column({ name: 'cash_back_duration', type: 'int' })
  cashBackDuration: number;

  @Column({ name: 'discount_online_shop_percent_tage', default: 0 })
  discountOnlineShopPercentage: number;

  @Column({
    name: 'metadata',
    type: 'text',
    transformer: jsonTransformer,
    nullable: true
  })
  metadata?: any;
}
