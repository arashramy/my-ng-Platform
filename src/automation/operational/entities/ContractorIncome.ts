import {Column, Entity, JoinColumn, ManyToOne,} from 'typeorm';
import {Relation} from '../../../common/decorators/mvc.decorator';
import {User} from "../../../base/entities/User";
import {CoreEntity} from "../../../base/entities/CoreEntity";
import {SaleItem} from "./SaleItem";

@Relation({})
@Entity({name: '_contractor_income'})
export class ContractorIncome extends CoreEntity {
  @ManyToOne(() => User)
  @JoinColumn({name: 'user'})
  user: User;
  @ManyToOne(() => SaleItem)
  @JoinColumn({name: 'sale_item', referencedColumnName: 'id'})
  saleItem: SaleItem;
  @Column({name: 'amount', default: 0})
  amount?: number;
  @Column({name: 'amount_after_discount', default: 0})
  amountAfterDiscount?: number;
  @Column({name: 'percent', default: 0})
  percent?: number = 0;
  @Column({name: 'fixed_amount', default: 0})
  fixedAmount: number = 0;
  @Column({name: 'is_partner', default: false})
  isPartner: boolean = false;
}
