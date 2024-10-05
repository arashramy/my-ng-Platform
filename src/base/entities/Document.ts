import {Column, Entity, Like} from "typeorm";
import {CoreEntity} from "./CoreEntity";
import {GlobalFilter, Relation} from "../../common/decorators/mvc.decorator";
import { Audit } from '../../common/decorators/audit.decorator';

export enum DocumentType {
    Cheque = "cheque", BillOfExchange = "bill_of_exchange", PaySlip = "pay_slip", Others = "others"
}

@Audit()
@Relation({})
@Entity({name: '_document'})
export class Document extends CoreEntity {
    @Column({name: 'name'})
    name?: string;

    @GlobalFilter({where:param => Like(param)})
    @Column({name: 'original_name'})
    originalName?: string;

    @Column({name: 'path'})
    path?: string;

    @Column({name: 'size'})
    size?: number;

    @Column({name: 'content_type'})
    contentType: string;

    @GlobalFilter({where:param => Like(param)})
    @Column('varchar', {name: 'type', default: DocumentType.Others})
    type: DocumentType;
}
