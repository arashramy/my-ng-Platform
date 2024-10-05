import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { Product } from './Product';
import { ProductCategory } from './ProductCategory';
import { Event } from './Event';

@Entity({ name: '_event_sub_product' })
export class EventSubProduct extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn()
  product: Product;

  @ManyToMany(() => ProductCategory, { nullable: true })
  @JoinTable()
  productCategories: ProductCategory[];

  @ManyToOne(() => Event)
  event: Event;

  @Column({ name: 'min' })
  min: number;

  @Column({ name: 'max' })
  max: number;
}
