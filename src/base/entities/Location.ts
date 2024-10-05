import {
  Column,
  Entity,
  JoinColumn,
  Like,
  ManyToOne,
  RelationId,
  Tree,
  TreeChildren,
  TreeParent
} from 'typeorm';
import { GlobalFilter, Relation } from '../../common/decorators/mvc.decorator';
import { IsNotEmpty } from 'class-validator';
import { SaleUnit } from './SaleUnit';
import { Province } from './Province';
import { City } from './City';
import { UrbanArea } from './UrbanArea';
import { OrganizationUnitBaseEntity } from './OrganizationUnitBaseEntity';
import { Audit } from '../../common/decorators/audit.decorator';
import { User } from './User';

@Audit()
@Relation({
  findAll: [
    'saleUnit',
    'city',
    'province',
    'area',
    'parent',
    'organizationUnit'
  ],
  get: ['saleUnit', 'city', 'province', 'area', 'parent', 'organizationUnit'],
  autoComplete: [
    'saleUnit',
    'city',
    'province',
    'area',
    'parent',
    'organizationUnit'
  ]
})
@Entity({ name: '_location' })
@Tree('materialized-path')
export class Location extends OrganizationUnitBaseEntity {
  @IsNotEmpty()
  @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  @Column({ name: 'title' })
  title?: string = '';

  @Column('json', { name: 'phones', default: '[]' })
  phones?: string[];

  @Column({ name: 'receiver', nullable: true })
  receiver?: string;

  @Column({ name: 'receiver_phone', nullable: true })
  receiverPhone?: string;

  @Column({ name: 'postal_code', nullable: true })
  postalCode?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user', referencedColumnName: 'id' })
  user: User;

  @GlobalFilter({})
  @ManyToOne(() => Province)
  @JoinColumn({ name: 'province' })
  province: Province;

  @JoinColumn({ name: 'is_online' })
  isOnline: boolean ;

  @RelationId((loc: Location) => loc.province)
  provinceId: number;

  @GlobalFilter({})
  @ManyToOne(() => City)
  @JoinColumn({ name: 'city' })
  city: City;

  @RelationId((loc: Location) => loc.city)
  cityId: number;

  @GlobalFilter({})
  @ManyToOne(() => UrbanArea)
  @JoinColumn({ name: 'area' })
  area: UrbanArea;

  @RelationId((loc: Location) => loc.area)
  areaId: number;

  @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  @Column({ name: 'address', nullable: true, default: null })
  address?: string;

  @Column('json',{ name: 'geo_location', nullable: true })
  geoLocation?: any;

  @ManyToOne(() => SaleUnit)
  @JoinColumn({ name: 'sale_unit' })
  saleUnit?: SaleUnit;

  @RelationId((loc: Location) => loc.saleUnit)
  saleUnitId?: number;

  @TreeParent({ onDelete: 'CASCADE' })
  parent?: Location;

  @RelationId((ou: Location) => ou.parent)
  parentId?: number;

  @TreeChildren({ cascade: true })
  children: Location[];
}
