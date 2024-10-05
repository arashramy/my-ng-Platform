import {Column, Entity, JoinColumn, Like, ManyToOne, RelationId} from "typeorm";
import {CoreEntity} from "./CoreEntity";
import {GlobalFilter, Relation} from "../../common/decorators/mvc.decorator";
import {UniqueValidate} from "../../common/validators/unique.validator";
import {IsNotEmpty} from "class-validator";
import {Province} from "./Province";
import { Audit } from '../../common/decorators/audit.decorator';

@Audit()
@Relation({
    findAll: ["province"],
    get: ["province"],
    autoComplete: ["province"],
})
@Entity({name: '_city'})
export class City extends CoreEntity {
    @IsNotEmpty()
    @UniqueValidate(City)
    @GlobalFilter({where: (param: string) => Like(`%${param}%`)})
    @Column({name: 'title'})
    title?: string = "";

    @ManyToOne(() => Province)
    @JoinColumn({name: 'province'})
    province: Province;

    @RelationId((city: City) => city.province)
    provinceId: number;
}
