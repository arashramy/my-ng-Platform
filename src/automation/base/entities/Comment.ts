import {Column, Entity, JoinColumn, ManyToOne, Tree, TreeChildren, TreeParent} from 'typeorm';
import {CoreEntity} from '../../../base/entities/CoreEntity';
import {Product} from "./Product";
import { Audit } from '../../../common/decorators/audit.decorator';


@Audit()
@Tree("nested-set")
@Entity({name: '_product_comment'})
export class Comment extends CoreEntity {

    @Column({name: 'comment'})
    comment?: string = '';

    @ManyToOne(() => Product)
    @JoinColumn({name: "product"})
    product: Product;

    @TreeParent()
    @JoinColumn({name: 'parent'})
    parent: Comment;

    @TreeChildren()
    comments: Comment[];
}