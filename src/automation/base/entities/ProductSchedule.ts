import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { Product } from './Product';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: '_product_schedule', schema: 'public' })
export class ProductSchedule extends CoreEntity {
  @Column('json', { name: 'days', default: '[]' })
  @ApiProperty({ type: [Number] })
  days?: number[] = [];

  @Column('time', { name: 'from_time' })
  @ApiProperty({ type: String })
  from?: string;

  @Column('time', { name: 'to_time' })
  @ApiProperty({ type: String })
  to: string;

  @Column({ name: 'price' })
  @ApiProperty({ type: Number })
  price: number;

  @ManyToOne(() => Product, (product) => product.schedules)
  @JoinColumn({ name: 'product', referencedColumnName: 'id' })
  @ApiProperty({ type: () => Product })
  product: Product;
}
