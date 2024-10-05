import { CoreEntity } from '../../../base/entities/CoreEntity';
import { Column, Entity, OneToMany } from 'typeorm';
import { Product } from './Product';
import { Relation } from '../../../common/decorators/mvc.decorator';

@Entity({ name: '_product_tag' })
@Relation({ findAll: ['products'], get: ['products'] })
export class ProductTag extends CoreEntity {
  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @OneToMany(() => Product, (product) => product.reportTag)
  products: Product[];
}
