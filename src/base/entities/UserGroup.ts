import {BaseEntity, Column, Entity} from 'typeorm';
import {Relation} from '../../common/decorators/mvc.decorator';

@Relation({
  findAll: [],
  get: [],
  autoComplete: [],
})
@Entity({name: '_user_workgroup', schema: 'public', synchronize: false})
export class UserGroup extends BaseEntity {

  @Column({name: 'group', primary: true})
  group: number;

  @Column({name: 'user', primary: true})
  user: number;
}
