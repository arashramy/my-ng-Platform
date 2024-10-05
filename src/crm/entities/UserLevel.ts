import { Column, Entity, ManyToMany, OneToMany } from 'typeorm';
import { CoreEntity } from '../../base/entities/CoreEntity';
import { User } from '../../base/entities/User';
import { GiftPackage } from './GiftPackage';

@Entity({ name: '_user_level' })
export class UserLevel extends CoreEntity {
  @Column({ name: 'title', default: '' })
  title: string;
  @Column({ name: 'as_default', default: false })
  asDefault: boolean = false;
  @OneToMany(() => User, (user) => user.customerGroup)
  users: User[];
  @ManyToMany(() => GiftPackage)
  giftPackages: GiftPackage[];
}
