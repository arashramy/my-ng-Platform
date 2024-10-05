import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { Relation } from '../../../common/decorators/mvc.decorator';
import { OrganizationUnitBaseEntity } from '../../../base/entities/OrganizationUnitBaseEntity';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { ProductCategory } from './ProductCategory';
import { Product } from './Product';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../base/entities/User';
import { ProductPrice } from './ProductPrice';

@Entity({ name: '_sub_product', schema: 'public' })
@Relation({
  findAll: [],
  get: ['organizationUnit', 'product', 'category', 'saleUnit'],
  autoComplete: []
})
export class SubProduct extends OrganizationUnitBaseEntity {
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'parent' })
  @ApiProperty({ type: () => Product })
  parent?: Product;
  @RelationId((s: SubProduct) => s.parent)
  parentId?: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product' })
  @ApiProperty({ type: () => Product })
  product?: Product;

  @RelationId((s: SubProduct) => s.product)
  productId?: number;

  @ManyToOne(() => ProductCategory)
  @JoinColumn({ name: 'category' })
  @ApiProperty({ type: () => ProductCategory })
  category?: ProductCategory;

  @RelationId((s: SubProduct) => s.category)
  categoryId?: number;

  @ManyToOne(() => SaleUnit)
  @JoinColumn({ name: 'sale_unit' })
  @ApiProperty({ type: () => SaleUnit })
  saleUnit?: SaleUnit;

  @RelationId((s: SubProduct) => s.saleUnit)
  saleUnitId?: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'contractor' })
  @ApiProperty({ type: () => User })
  contractor?: User;

  @RelationId((s: SubProduct) => s.contractor)
  contractorId?: number;

  @ManyToOne(() => ProductPrice)
  @JoinColumn({ name: 'price_item' })
  @ApiProperty({ type: () => ProductPrice })
  price?: ProductPrice;

  @RelationId((s: SubProduct) => s.price)
  priceId?: number;

  @Column({ name: 'quantity', default: 1 })
  @ApiProperty({ type: Number })
  quantity?: number = 1;

  @Column({ name: 'discount', default: 0 })
  @ApiProperty({ type: Number })
  discount?: number = 0;

  @Column({ name: 'amount' })
  amount?: number;

  @Column({ name: 'tax' })
  tax?: number;
}
