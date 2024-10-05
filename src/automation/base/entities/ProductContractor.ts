import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { User } from '../../../base/entities/User';
import { Product } from './Product';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: '_product_contractor', schema: 'public' })
export class ProductContractor extends CoreEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'contractor', referencedColumnName: 'id' })
  @ApiProperty({ type: () => User })
  contractor?: User;

  @RelationId((object: ProductContractor) => object.contractor)
  @ApiProperty({ type: Number })
  contractorId?: number;

  @Column({ name: 'percent', default: 0 })
  @ApiProperty({ type: Number })
  percent?: number = 0;

  @Column({ name: 'amount', default: 0 })
  @ApiProperty({ type: Number })
  amount: number = 0;

  @ManyToOne(() => Product, (product) => product.contractors)
  @JoinColumn({ name: 'product', referencedColumnName: 'id' })
  @ApiProperty({ type: () => Product })
  product: Product;
}
