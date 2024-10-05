import { Column, Entity, OneToMany } from 'typeorm';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { IsNotEmpty } from 'class-validator';
import { UniqueValidate } from '../../../common/validators/unique.validator';
import { Product } from './Product';
import { Locker } from './Locker';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { Relation } from '../../../common/decorators/mvc.decorator';

@Relation({
  findAll: ['saleUnits', 'products', 'lockers']
})
@Entity({ name: '_locker_location' })
export class LockerLocation extends CoreEntity {
  @Column({ name: 'title' })
  title?: string = '';

  @OneToMany(() => SaleUnit, (object: SaleUnit) => object.lockerLocation)
  saleUnits: SaleUnit[];

  @OneToMany(() => Product, (obj) => obj.lockerLocation)
  products: Product[];

  @OneToMany(() => Locker, (object: Locker) => object.lockerLocation, {
    cascade: true,
    orphanedRowAction: 'soft-delete',
    persistence: true,
    nullable: true
  })
  lockers: Locker[];
}
