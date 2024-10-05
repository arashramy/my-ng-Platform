import {Column, Entity, JoinColumn, Like, ManyToOne} from 'typeorm';
import {IsNotEmpty} from 'class-validator';
import {UniqueValidate} from '../../common/validators/unique.validator';
import {GlobalFilter, Relation} from '../../common/decorators/mvc.decorator';
import {Export} from '../../common/decorators/export.decorator';
import {SaleUnit} from "./SaleUnit";
import {CoreEntity} from "./CoreEntity";
import { Audit } from '../../common/decorators/audit.decorator';

@Audit()
@Export<CashDesk>({
  name: 'Cash',
  translateKey: 'cash',
  columns: {
    enable: {
      transform: (obj) => (obj.enable ? 'enable' : 'disable'),
    },
    saleUnit: {transform: (obj) => (obj.saleUnit?.title)}
  },
})

@Relation({
  findAll: ["saleUnit"],
  get: ["saleUnit"],
  autoComplete: [],
})
@Entity({name: '_cash_desk', schema: 'public'})
export class CashDesk extends CoreEntity {
  @IsNotEmpty()
  @UniqueValidate(CashDesk)
  @GlobalFilter({where: (param: string) => Like(`%${param}%`)})
  @Column({name: 'title'})
  title?: string;

  @ManyToOne(() => SaleUnit, object => object.id)
  @JoinColumn({name: "sale_unit", referencedColumnName: 'id'})
  saleUnit?: SaleUnit;

  @Column({name: 'status', default: true})
  enable?: boolean;

}
