import { SaleUnit } from '../../../base/entities/SaleUnit';
import { User } from '../../../base/entities/User';
import { Column, Entity, JoinColumn, Like, ManyToOne } from 'typeorm';
import { Task } from '../../base/entities/Task';
import { Project } from './Project';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { Relation } from '../../../common/decorators/mvc.decorator';
import { Ticket } from '../../../crm/entities/Ticket';

@Relation({
  findAll: ['saleUnit', 'task', 'user', 'project', 'ticket'],
  get: ['saleUnit', 'task', 'user', 'project', 'ticket']
})
@Entity({ name: '_activity' })
export class Activity extends CoreEntity {
  @Column({ name: 'date', nullable: true, default: new Date() })
  date?: Date;
  @ManyToOne(() => SaleUnit, (object) => object.id)
  @JoinColumn({ name: 'sale_unit', referencedColumnName: 'id' })
  saleUnit?: SaleUnit;
  @ManyToOne(() => User, (object) => object.id)
  @JoinColumn({ name: 'user', referencedColumnName: 'id' })
  user?: User;

  @ManyToOne(() => Project, (object) => object.id)
  @JoinColumn({ name: 'project', referencedColumnName: 'id' })
  project?: Project;
  @ManyToOne(() => Task, (object) => object.id)
  @JoinColumn({ name: 'task', referencedColumnName: 'id' })
  task?: Task;
  @Column({ name: 'cost', nullable: true, default: 0 })
  cost?: number;
  @Column({ name: 'duration_time', nullable: true, default: 0 })
  duration?: number;
  @Column({ name: 'wasting_time', nullable: true, default: 0 })
  waistingTime?: number;

  @ManyToOne(() => Ticket, (object) => object.id)
  @JoinColumn({ name: 'ticket', referencedColumnName: 'id' })
  ticket?: Ticket;

  @Column({ name: 'description', nullable: true, default: null })
  description?: string;
  @Column('json', { name: 'attachments', nullable: true })
  attachment?: any;
}
