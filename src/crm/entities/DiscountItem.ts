import {Column, Entity, JoinColumn, ManyToOne, RelationId} from 'typeorm';
import {Relation} from '../../common/decorators/mvc.decorator';
import {OrganizationUnitBaseEntity} from "../../base/entities/OrganizationUnitBaseEntity";
import {SaleUnit} from "../../base/entities/SaleUnit";
import {ProductCategory} from "../../automation/base/entities/ProductCategory";
import {Product} from "../../automation/base/entities/Product";
import {OfferedDiscount} from "./OfferedDiscount";

@Entity({name: '_discount_item'})
@Relation({
  findAll: [],
  get: ['organizationUnit', 'product', 'category', 'saleUnit'],
  autoComplete: []
})
export class DiscountItem extends OrganizationUnitBaseEntity {
  @ManyToOne(() => OfferedDiscount)
  @JoinColumn({name: 'parent'})
  parent?: OfferedDiscount;
  @RelationId((object: DiscountItem) => object.parent)
  parentId?: number;
  @ManyToOne(() => Product)
  @JoinColumn({name: 'product'})
  product?: Product;
  @RelationId((object: DiscountItem) => object.product)
  productId?: number;
  @ManyToOne(() => ProductCategory)
  @JoinColumn({name: 'category'})
  category?: ProductCategory;
  @RelationId((object: DiscountItem) => object.category)
  categoryId?: number;
  @ManyToOne(() => SaleUnit)
  @JoinColumn({name: 'sale_unit'})
  saleUnit?: SaleUnit;
  @RelationId((object: DiscountItem) => object.saleUnit)
  saleUnitId?: number;
  @Column({name: 'min', default: 0})
  min?: number = 0;
  @Column({name: 'max', nullable: true})
  max?: number;
  @Column({name: 'first', default: false})
  first?: boolean;
}
