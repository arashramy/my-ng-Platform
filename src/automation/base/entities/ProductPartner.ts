import {Column, Entity, JoinColumn, ManyToOne, RelationId} from 'typeorm';
import {CoreEntity} from '../../../base/entities/CoreEntity';
import {User} from '../../../base/entities/User';
import {Product} from "./Product";

@Entity({name: '_product_partner'})
export class ProductPartner extends CoreEntity {
  @ManyToOne(() => User)
  @JoinColumn({name: 'user', referencedColumnName: 'id'})
  user?: User;
  @RelationId((object: ProductPartner) => object.user)
  userId?: number;
  @Column({name: 'percent', default: 0})
  percent?: number = 0;
  @Column({name: 'amount', default: 0})
  amount: number = 0;
  @ManyToOne(() => Product, (product) => product.partners)
  @JoinColumn({name: 'product', referencedColumnName: 'id'})
  product: Product;
}
