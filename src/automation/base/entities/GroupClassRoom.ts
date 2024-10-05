import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  Like,
  ManyToMany,
  ManyToOne,
  OneToMany,
  RelationId
} from 'typeorm';
import { OrganizationUnitBaseEntity } from '../../../base/entities/OrganizationUnitBaseEntity';
import { IsNotEmpty } from 'class-validator';
import {
  GlobalFilter,
  Relation
} from '../../../common/decorators/mvc.decorator';
import { User } from '../../../base/entities/User';
import { Location } from '../../../base/entities/Location';
import { ProductCategory } from './ProductCategory';
import { GroupClassRoomSchedules } from './GroupClassRoomSchedules';
import { Product } from './Product';
import { Audit } from '../../../common/decorators/audit.decorator';
import { jsonTransformer } from '../../../common/typeorm/converter/json-transformer';

@Audit()
@Relation({
  findAll: [
    'organizationUnit',
    'contractors',
    'category',
    'location',
    'schedules',
    {
      name: 'service',
      relations: ['authorizedSalesUnits']
    }
  ],
  get: [
    'organizationUnit',
    'contractors',
    'category',
    'location',
    'service',
    'schedules'
  ],
  autoComplete: ['organizationUnit'],
  customFilter: {
    authorizedSalesUnits: (param) =>
      `(service_authorizedSalesUnits.id IS NULL OR service_authorizedSalesUnits.id = ${param})`
  }
})
@Entity({ name: '_group_class_room' })
export class GroupClassRoom extends OrganizationUnitBaseEntity {
  @IsNotEmpty()
  @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  @Column({ name: 'title' })
  title?: string = '';

  @Column({ name: 'price', default: 0 })
  price: number;

  @Column({ name: 'sessions', default: 0 })
  sessions: number;

  @Column({ name: 'durations', default: 0 })
  durations: number;

  @Column({ name: 'filled', default: 0 })
  filled: number;

  @Column({ name: 'quantity' })
  quantity: number;

  @Column({ name: 'quantity_online_sale' })
  quantityOnlineSale: number;

  @Column({ name: 'quantity_alarm' })
  quantityAlarm: number;

  @Column({ name: 'enabled', default: true })
  enabled?: boolean;

  @Column({ name: 'reservable', default: false })
  reservable?: boolean;

  @Column({ name: 'fixed', default: false })
  fixed?: boolean;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'service', referencedColumnName: 'id' })
  service?: Product;

  @ManyToOne(() => ProductCategory)
  @JoinColumn({ name: 'category', referencedColumnName: 'id' })
  category?: ProductCategory;

  @ManyToMany(() => User)
  @JoinTable()
  contractors: User[];

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'location', referencedColumnName: 'id' })
  location?: Location;

  @OneToMany(() => GroupClassRoomSchedules, (object) => object.groupClassRoom, {
    cascade: false,
    orphanedRowAction: 'soft-delete',
    persistence: true
  })
  schedules?: GroupClassRoomSchedules[];

  @Column({ name: 'order', type: 'int', default: 0 })
  order: number;

  @Column({
    name: 'configs',
    type: 'text',
    transformer: jsonTransformer,
    default: '[]'
  })
  configs: { contractorId: number; contractorName: string; max: number }[];
}
