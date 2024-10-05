import {Column, Entity, Like, ManyToMany} from "typeorm";
import {CoreEntity} from "./CoreEntity";
import {User} from "./User";
import {Permission} from "./Permission";
import {GlobalFilter, Relation} from "../../common/decorators/mvc.decorator";
import {UniqueValidate} from "../../common/validators/unique.validator";
import {IsNotEmpty} from "class-validator";
import { Audit } from '../../common/decorators/audit.decorator';

@Audit()
@Relation({
    findAll: [],
    get: [],
    autoComplete: [],
})
@Entity({name: '_group'})
export class WorkGroup extends CoreEntity {
    @IsNotEmpty()
    @UniqueValidate(WorkGroup)
    @GlobalFilter({where: (param: string) => Like(`%${param}%`)})
    @Column({name: 'title'})
    title?: string;

    @Column('boolean', {name: 'support', default: false})
    support?: boolean;

    permissions?: Permission[];
}
