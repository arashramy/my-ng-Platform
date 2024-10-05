import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CoreEntity } from './CoreEntity';
import { SaleUnit } from './SaleUnit';
import { User } from './User';
import { Relation } from '../../common/decorators/mvc.decorator';

@Relation({
  findAll: ['user', 'saleUnit']
})
@Entity({ name: '_user_description' })
export class UserDescription extends CoreEntity {
  @ManyToOne(() => User, (user) => user.userDescriptions)
  @JoinColumn()
  user: User;

  @ManyToOne(() => SaleUnit, (user) => user.userDescriptions)
  @JoinColumn()
  saleUnit: SaleUnit;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'invisible', type: 'boolean', default: false })
  invisible?: boolean = false;
}
