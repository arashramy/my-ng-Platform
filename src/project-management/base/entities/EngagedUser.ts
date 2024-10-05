import { User } from '../../../base/entities/User';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { Position } from './Position';
import { Project } from '../../operational/entities/Project';
import { Relation } from '../../../common/decorators/mvc.decorator';

@Relation({
  findAll: ['position', 'user'],
  get: ['position', 'user'],
  autoComplete: []
})
@Entity({ name: '_engaged_user' })
export class EngagedUser extends BaseEntity {
  @Column('unsigned big int', { name: 'id' })
  @PrimaryGeneratedColumn()
  id?: number;

  @ManyToOne(() => Position, (object) => object.id)
  @JoinColumn({ name: 'position', referencedColumnName: 'id' })
  position?: Position;

  @ManyToOne(() => User, (object) => object.id)
  @JoinColumn({ name: 'user', referencedColumnName: 'id' })
  user?: User;

  @ManyToOne(() => Project, (object) => object.id)
  @JoinColumn({ name: 'project', referencedColumnName: 'id' })
  project?: Project;
}
