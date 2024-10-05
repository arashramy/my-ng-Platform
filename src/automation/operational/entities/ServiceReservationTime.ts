import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { Relation } from '../../../common/decorators/mvc.decorator';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { SaleItem } from './SaleItem';

@Relation({
  findAll: [],
  get: [],
  autoComplete: []
})
@Entity('_service_reservation_time')
export class ServiceReservationTime extends CoreEntity {
  @ManyToOne(() => SaleItem)
  @JoinColumn({ name: 'sale_item', referencedColumnName: 'id' })
  saleItem: SaleItem;
  @RelationId((object: ServiceReservationTime) => object.saleItem)
  saleItemId?: number;
  @Column('date', { name: 'date' })
  date?: Date;
  @Column('time', { name: 'from_time' })
  from?: string;
  @Column('time', { name: 'to_time' })
  to: string;
  @Column('int', { name: 'status' })
  status: number;
}
