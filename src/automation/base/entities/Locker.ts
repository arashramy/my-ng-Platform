import {
  Column,
  Entity,
  Equal,
  JoinColumn,
  Like,
  ManyToOne,
  OneToMany,
  RelationId
} from 'typeorm';
import { LockerItem } from '../../operational/entities/LockerItem';
import {
  GlobalFilter,
  OrganizationUnitFilter,
  Relation
} from '../../../common/decorators/mvc.decorator';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIP,
  IsNotEmpty,
  ValidateNested
} from 'class-validator';
import { UniqueValidate } from '../../../common/validators/unique.validator';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { Audit } from '../../../common/decorators/audit.decorator';
import { LockerLocation } from './LockerLocation';

@Audit()
@Relation({
  findAll: [ 'items','lockerLocation'],
  get: [ 'items','lockerLocation'],
  autoComplete: []
})
@Entity({ name: '_locker' })
export class Locker extends CoreEntity {
  @IsNotEmpty()
  @UniqueValidate(Locker)
  @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  @Column({ name: 'title' })
  title?: string = '';
  @GlobalFilter({ where: (param: string) => Equal(param) })
  @Column({ name: 'ip_address' })
  ipAddress?: string = '';
  //@IsPort()
  @Column({ name: 'port', default: 80 })
  port?: number;
  @Column('int', { name: 'relay_delay_time', default: 0 })
  relayDelayTime: number;
  @Column('int', { name: 'relay_on_time', default: 0 })
  relayOnTime: number;
  @ValidateNested()
  @ArrayMaxSize(16)
  @ArrayMinSize(16)
  @OneToMany(() => LockerItem, (item) => item.locker, {
    cascade: ['soft-remove', 'insert', 'update']
  })
  items?: LockerItem[];
  // @OrganizationUnitFilter("organizationUnit")
  // @JoinColumn({name: "sale_unit"})
  // @ManyToOne(() => SaleUnit)
  // saleUnit?: SaleUnit;
  // @RelationId((obj: Locker) => obj.saleUnit)
  // saleUnitId?: number;

  @ManyToOne(() => LockerLocation)
  @JoinColumn({ name: 'locker_location', referencedColumnName: 'id' })
  lockerLocation?: LockerLocation;
  @RelationId((obj: Locker) => obj.lockerLocation)
  lockerLocationId?: number;
}
