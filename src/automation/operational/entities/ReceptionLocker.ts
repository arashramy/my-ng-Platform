import {Column, Entity, IsNull, JoinColumn, ManyToOne} from 'typeorm';
import {CoreEntity} from '../../../base/entities/CoreEntity';
import {LockerItem, LockerStatus} from './LockerItem';
import {SaleOrder} from "./SaleOrder";

@Entity({name: '_reception_lockers'})
export class ReceptionLocker extends CoreEntity {
  @ManyToOne(() => SaleOrder)
  @JoinColumn({name: 'reception', referencedColumnName: 'id'})
  reception: SaleOrder;
  @Column({name: 'locker', default: 0})
  locker?: number;
}
