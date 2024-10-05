import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId
} from 'typeorm';
import { CoreEntity } from '../../base/entities/CoreEntity';
import { Relation } from '../../common/decorators/mvc.decorator';
import { WorkGroup } from '../../base/entities/WorkGroup';
import { User } from '../../base/entities/User';
import { TicketItem } from './TicketItem';
import { Audit } from '../../common/decorators/audit.decorator';
import { Project } from '../../project-management/operational/entities/Project';

export enum TicketStatus {
  Pending,
  Answered,
  Closed
}

export enum TicketPriority {
  Low,
  Normal,
  High
}

@Audit()
@Relation({
  findAll: ['user', 'project'],
  get: ['user', 'project'],
  autoComplete: ['user', 'project'],
  customFilter:{},
  customSort:{}
})
@Entity('_ticket', { schema: 'public' })
export class Ticket extends CoreEntity {
  @Column('varchar', { name: 'subject' })
  subject: string;

  @Column('varchar', { name: 'secret_data', nullable: true, length: 1024 })
  secretData: string;

  @Column('integer', { name: 'status', default: 0 })
  status: TicketStatus;

  @Column('integer', { name: 'priority', default: 0 })
  priority: TicketPriority;

  @Column('integer', { name: 'rate', nullable: true })
  rate: number;

  @ManyToOne(() => WorkGroup)
  @JoinColumn([{ name: 'group', referencedColumnName: 'id' }])
  group: WorkGroup;

  @ManyToOne(() => Project, (object) => object.id)
  @JoinColumn({ name: 'project', referencedColumnName: 'id' })
  project?: Project;

  @RelationId((t: Ticket) => t.group)
  groupId?: number;

  @ManyToOne(() => User)
  @JoinColumn([{ name: 'user', referencedColumnName: 'id' }])
  user: User;

  @RelationId((t: Ticket) => t.user)
  userId?: number;

  @OneToMany(() => TicketItem, (item) => item.ticket)
  items: TicketItem[];
}
