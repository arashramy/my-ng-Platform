import { Column, Entity, OneToMany } from 'typeorm';
import { CoreEntity } from './CoreEntity';
import { SaleUnit } from './SaleUnit';
import { AttendanceDevice } from './AttendanceDevice';

@Entity({ name: '_printer' })
export class Printer extends CoreEntity {
  @Column({ name: 'is_active', type: 'boolean' })
  isActive: boolean;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'ip', type: 'varchar' })
  ip: string;

  @Column({ name: 'port', type: 'integer' })
  port: number;

  @OneToMany(() => SaleUnit, (saleUnit) => saleUnit.id, { nullable: true })
  saleUnits?: SaleUnit[];

  @OneToMany(() => AttendanceDevice, (device) => device.defaultPrinter, {
    nullable: true
  })
  devices: AttendanceDevice;
}
