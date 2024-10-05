import {Column, Entity, JoinTable, LessThanOrEqual, Like, ManyToMany, MoreThan} from 'typeorm';
import {IsNotEmpty} from 'class-validator';
import {UniqueValidate} from '../../../common/validators/unique.validator';
import {GlobalFilter, OrganizationUnitFilter, Relation} from '../../../common/decorators/mvc.decorator';
import {IntersectValidate} from '../../../common/validators/interscets.validator';
import {Export} from '../../../common/decorators/export.decorator';
import {CoreEntity} from "../../../base/entities/CoreEntity";
import {OrganizationUnit} from "../../../base/entities/OrganizationUnit";
import { Audit } from '../../../common/decorators/audit.decorator';

export enum GiftType {
  percent,
  price,
}

@Audit()
@Export<WalletGift>({
  name: 'Credit Gift',
  translateKey: 'walletGift',
  columns: {
    type: {
      transform: (value: WalletGift) =>
          value.type == GiftType.percent
              ? 'walletGift.percent'
              : 'walletGift.price',
    },
    organizationUnits: {transform: (obj) => obj.organizationUnits?.map(ou => ou?.title).join("\n")}
  },
})
@Relation({
  findAll: [
    'organizationUnits',
  ],
  get: ['organizationUnits'],
  autoComplete: []
})
@Entity({name: '_wallet_gift', schema: 'public'})
export class WalletGift extends CoreEntity {
  @IsNotEmpty()
  @UniqueValidate(WalletGift)
  @GlobalFilter({where: (param: string) => Like(`%${param}%`)})
  @Column({name: 'title'})
  title?: string = '';
  @IntersectValidate(WalletGift, 'fromPrice', 'toPrice')
  @Column({name: 'from_price', default: 0})
  fromPrice?: number = 0;
  @Column({name: 'to_price', default: 0})
  toPrice?: number = 0;
  @Column('int', {name: 'percent', default: 0})
  type?: GiftType = GiftType.percent;
  @IsNotEmpty()
  @Column({name: 'gift', default: 0})
  gift?: number = 0;
  @OrganizationUnitFilter()
  @JoinTable({
    name: '_wallet_gift_org_unit',
    joinColumn: {name: 'wallet_gift'},
    inverseJoinColumn: {name: 'org_unit'}
  })
  @ManyToMany(() => OrganizationUnit, {})
  organizationUnits?: OrganizationUnit[] = null;
  @Column('boolean', {name: 'cheque', default: false})
  cheque: boolean;

  static async depositGift(price: number): Promise<[WalletGift, number]> {
    let gift = await WalletGift.findOne({
      where: {
        fromPrice: LessThanOrEqual(price),
        toPrice: MoreThan(price),
      },
    });
    if (gift) {
      return [
        gift,
        gift.type == GiftType.percent ? (price * gift.gift) / 100 : gift.gift,
      ];
    }
    return [null, 0];
  }
}
