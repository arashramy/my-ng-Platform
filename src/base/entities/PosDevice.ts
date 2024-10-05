import { Column, Entity, Equal, Like } from 'typeorm';
import { IsIP, IsNotEmpty } from 'class-validator';
import { UniqueValidate } from '../../common/validators/unique.validator';
import { GlobalFilter, Relation } from '../../common/decorators/mvc.decorator';
import { OrganizationUnitBaseEntity } from './OrganizationUnitBaseEntity';
import { jsonTransformer } from '../../common/typeorm/converter/json-transformer';
import { Audit } from '../../common/decorators/audit.decorator';

export enum PosCompany {
  SamanKish
}

export enum PosType {
  NormalPos,
  AndroidPos
}

@Audit()
@Relation({
  findAll: ['organizationUnit'],
  get: ['organizationUnit'],
  autoComplete: ['organizationUnit']
})
@Entity({ name: '_pos_device' })
export class PosDevice extends OrganizationUnitBaseEntity {
  @IsNotEmpty()
  @UniqueValidate(PosDevice)
  @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  @Column({ name: 'title' })
  title?: string = '';

  @IsNotEmpty()
  @IsIP(4)
  @GlobalFilter({ where: (param: string) => Equal(param) })
  @Column({ name: 'ip_address' })
  ipAddress?: string = '';

  @Column({ name: 'port', nullable: true })
  port?: number;

  @Column('int', { name: 'type', default: PosType.NormalPos })
  type: PosType;

  @Column('int', { name: 'company', default: PosCompany.SamanKish })
  company: PosCompany;

  @Column({ name: 'enable', default: true })
  enable?: boolean;

  @Column({
    name: 'config',
    type: 'text',
    transformer: jsonTransformer,
    default: '[]'
  })
  config: any;
}
