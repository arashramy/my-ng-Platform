import {
  Column,
  Entity,
  JoinColumn,
  Like,
  ManyToMany,
  OneToMany,
  Tree,
  TreeChildren,
  TreeParent
} from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { UniqueValidate } from '../../../common/validators/unique.validator';
import {
  GlobalFilter,
  Relation
} from '../../../common/decorators/mvc.decorator';
import { Export } from '../../../common/decorators/export.decorator';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { Image } from '../../../base/dto/image.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Audit } from '../../../common/decorators/audit.decorator';
import { Event } from './Event';
import { SaleOrder } from '../../../automation/operational/entities/SaleOrder';

export enum ProductType {
  Product,
  Service,
  Credit,
  Package
}

@Audit()
@Relation({
  findAll: [],
  get: [],
  autoComplete: []
})
@Export<ProductCategory>({
  name: 'Product Category',
  translateKey: 'BASE_PRODUCT_CATEGORY',
  columns: {
    image: { type: 'image' }
  }
})
@Entity({ name: '_product_category', schema: 'public' })
@Tree('materialized-path')
export class ProductCategory extends CoreEntity {
  @IsNotEmpty()
  @UniqueValidate(ProductCategory)
  @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  @Column({ name: 'title' })
  @ApiProperty()
  title?: string = '';

  @Column({ name: 'for_event' })
  forEvent: boolean = false;

  @Column('int', { name: 'type', default: ProductType.Product })
  @ApiProperty({ enum: ProductType })
  type: ProductType = ProductType.Product;

  @ManyToMany(() => Event, { persistence: true })
  events: Event[];

  @Column('json', {
    name: 'image',
    nullable: true
  })
  @ApiProperty()
  image?: Image;

  @TreeParent()
  @JoinColumn({ name: 'parent' })
  parent: ProductCategory;

  @TreeChildren()
  categories: ProductCategory[];

  @Column({ name: 'is_online', nullable: true })
  isOnline?: boolean = false;

  @OneToMany(() => SaleOrder, (order) => order.productCategory)
  saleOrders: ProductCategory[];
}
