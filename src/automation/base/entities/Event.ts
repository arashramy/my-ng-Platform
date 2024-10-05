import { CoreEntity } from '../../../base/entities/CoreEntity';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany
} from 'typeorm';
import { ProductCategory } from './ProductCategory';
import { Location } from '../../../base/entities/Location';
import { Relation } from '../../../common/decorators/mvc.decorator';
import { EventSubProduct } from './EventSubProduct';
import { SaleOrder } from '../../../automation/operational/entities/SaleOrder';
import { FiscalYear } from '../../../base/entities/FiscalYears';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { OrganizationUnit } from '../../../base/entities/OrganizationUnit';

export enum EventStatus {
  Pending = 'Pending',
  Started = 'Started',
  Finished = 'Finished',
  Stopped = 'Stopped'
}

@Relation({
  findAll: [
    'location',
    'productCategories',
    { name: 'subProducts', relations: ['product', 'productCategories'] },
    'saleUnit',
    'organizationUnit',
    'fiscalYear'
  ]
})
@Entity({ name: '_event' })
export class Event extends CoreEntity {
  @Column({ name: 'title' })
  title: string;

  @Column({ name: 'start_date' })
  startDate: Date;

  @Column({ name: 'end_date' })
  endDate: Date;

  @Column({ name: 'start_sale_date' })
  sellDate: Date;

  @ManyToMany(() => ProductCategory, {
    cascade: false,
    persistence: true
  })
  @JoinTable()
  productCategories: ProductCategory[];

  @ManyToOne(() => Location)
  @JoinColumn()
  location: Location;

  @Column({ name: 'status', default: EventStatus.Pending })
  status: EventStatus;

  @Column({ name: 'description', default: '' })
  description: string;

  @Column({ name: 'attachment', default: '' })
  attachment: string;

  @OneToMany(() => EventSubProduct, (subProduct) => subProduct.event, {
    nullable: true
  })
  subProducts: EventSubProduct[];

  @OneToMany(() => SaleOrder, (order) => order.event)
  saleOrders: SaleOrder[];

  @ManyToOne(() => FiscalYear)
  @JoinColumn()
  fiscalYear: FiscalYear;

  @ManyToOne(() => SaleUnit)
  @JoinColumn()
  saleUnit: SaleUnit;

  @ManyToOne(() => OrganizationUnit)
  @JoinColumn()
  organizationUnit: OrganizationUnit;
}
