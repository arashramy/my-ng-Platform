import {
  Column,
  Entity,
  Equal,
  JoinColumn,
  JoinTable,
  Like,
  ManyToMany,
  ManyToOne,
  OneToMany,
  RelationId
} from 'typeorm';
import { IsIP, IsNotEmpty, IsObject, IsPort } from 'class-validator';
import { UniqueValidate } from '../../common/validators/unique.validator';
import { GlobalFilter, Relation } from '../../common/decorators/mvc.decorator';
import { SaleUnit } from './SaleUnit';
import { OrganizationUnitBaseEntity } from './OrganizationUnitBaseEntity';
import { jsonTransformer } from '../../common/typeorm/converter/json-transformer';
import { Audit } from '../../common/decorators/audit.decorator';
import { AttendanceDeviceLog } from './AttendanceDeviceLog';
import { User } from './User';
import { Printer } from './Printer';

export enum DeviceType {
  Paliz,
  Virdi
}

export enum DeviceOperation {
  Reception,
  Locker,
  Exit,
  ReceptionAndExit,
  Shop,
  OpenGate
}

@Audit()
@Relation({
  findAll: ['saleUnit', 'organizationUnit', 'operators', 'defaultPrinter'],
  get: ['saleUnit', 'organizationUnit', 'operators'],
  autoComplete: ['saleUnit', 'organizationUnit', 'operators']
})
@Entity({ name: '_attendance_device' })
export class AttendanceDevice extends OrganizationUnitBaseEntity {
  @IsNotEmpty()
  @UniqueValidate(AttendanceDevice)
  @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  @Column({ name: 'title' })
  title?: string = '';

  @IsNotEmpty()
  @IsIP(4)
  @GlobalFilter({ where: (param: string) => Equal(param) })
  @Column({ name: 'ip_address' })
  ipAddress?: string = '';

  @Column({ name: 'port', default: 80 })
  port?: number;

  @Column('int', { name: 'type', nullable: true })
  type: DeviceType;

  @Column('enum', {
    name: 'operation',
    enum: DeviceOperation,
    default: DeviceOperation.Reception
  })
  deviceOperation: DeviceOperation;

  @JoinColumn({ name: 'sale_unit' })
  @ManyToOne(() => SaleUnit)
  saleUnit?: SaleUnit;

  @RelationId((object: AttendanceDevice) => object.saleUnit)
  saleUnitId?: number;

  @Column({
    name: 'config',
    type: 'text',
    transformer: jsonTransformer,
    default: '[]'
  })
  config: any;

  @Column({ name: 'device_code', nullable: true })
  deviceCode: string;

  @OneToMany(() => AttendanceDeviceLog, (deviceLog) => deviceLog.device)
  logs: AttendanceDeviceLog[];

  @Column({ name: 'has_gate', type: 'boolean', default: false })
  hasGate?: boolean;

  @ManyToMany(() => User)
  @JoinTable()
  operators: User[];

  @ManyToOne(() => Printer, { nullable: true })
  defaultPrinter?: Printer;

  @Column({
    name: 'device_access_policies',
    type: 'json',
    default: '{"users":[], "workgroups":[]}'
  })
  @IsObject()
  deviceAccessPolicies?: { [key: string]: any };
}
