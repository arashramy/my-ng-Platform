import { CoreEntity } from '../../../base/entities/CoreEntity';
import { User } from '../../../base/entities/User';
import {
  Column,
  Entity,
  JoinColumn,
  Like,
  ManyToOne,
  OneToMany
} from 'typeorm';
import { EngagedUser } from '../../base/entities/EngagedUser';
import { GlobalFilter, Relation } from '../../../common/decorators/mvc.decorator';

export enum ProjectStatus {
  Open,
  Pending,
  Holding,
  InProgress,
  Completed
}

@Relation({
  findAll: [
    'legalCustomer',
    'user',
    { name: 'engagedUsers', relations: ['user', 'position'] }
  ],
  get: [
    'legalCustomer',
    'user',
    { name: 'engagedUsers', relations: ['user', 'position'] }
  ]
})
@Entity({ name: '_project' })
export class Project extends CoreEntity {
  @Column({ name: 'title' })
  @GlobalFilter({
    where: (param: string) => {
      if (!Number(param)) {
        return Like(`%${param}%`);
      }
    }
  })
  title?: string;

  @ManyToOne(() => User, (object) => object.id)
  @JoinColumn({ name: 'legal_customer', referencedColumnName: 'id' })
  legalCustomer?: User;

  @ManyToOne(() => User, (object) => object.id)
  @JoinColumn({ name: 'user', referencedColumnName: 'id' })
  user?: User;

  @Column({ name: 'start_date' })
  startDate?: Date;

  @Column({ name: 'end_date', nullable: true })
  endDate?: Date;

  @Column({ name: 'status', enum: ProjectStatus, default: ProjectStatus.Open })
  status?: number;

  @OneToMany(() => EngagedUser, (engagedUser) => engagedUser.project, {
    cascade: true,
    persistence: true,
    nullable: true
  })
  engagedUsers?: EngagedUser[];
}
