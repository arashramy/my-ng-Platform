import {Column, Entity, JoinColumn, ManyToOne, OneToMany, RelationId} from 'typeorm';
import {User} from "../../base/entities/User";
import {DiscountItem} from "./DiscountItem";
import {WorkGroup} from "../../base/entities/WorkGroup";
import {Relation} from "../../common/decorators/mvc.decorator";
import {CoreEntity} from "../../base/entities/CoreEntity";
import { Audit } from '../../common/decorators/audit.decorator';

@Audit()
@Relation({
    findAll: ["user", 'group'],
    get: ['user', 'group', 'items', 'items.organizationUnit', 'items.saleUnit', 'items.product', 'items.category'],
})
@Entity({name: '_offered_discount', schema: 'public'})
export class OfferedDiscount extends CoreEntity {

    @Column({name: 'title'})
    title?: string;

    @Column('date', {name: 'start_time'})
    start?: Date;

    @Column('date', {name: 'expired_time'})
    expired?: Date;

    @Column('boolean', {name: 'is_percent', default: false})
    isPercent?: boolean = false;

    @Column({name: 'amount', default: 0})
    amount?: number = 0;

    @OneToMany(() => DiscountItem, object => object.parent,
        {persistence: true, orphanedRowAction: "soft-delete", cascade: true})
    items?: DiscountItem[];

    @Column({name: 'quantity', default: 1})
    quantity?: number = 1;

    @Column({name: 'max_value', nullable: true})
    maxValue?: number;

    @Column({name: 'code', nullable: true})
    code?: string;

    @ManyToOne(() => User)
    @JoinColumn({name: 'user'})
    user?: User;

    @RelationId((d: OfferedDiscount) => d.user)
    userId?: number;

    @ManyToOne(() => WorkGroup)
    @JoinColumn({name: 'group'})
    group?: WorkGroup;

    @RelationId((d: OfferedDiscount) => d.group)
    groupId?: number;

    used?: number = 0;
}
