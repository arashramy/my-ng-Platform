import {Column, Entity, JoinColumn, Like, ManyToOne, RelationId} from "typeorm";
import {CoreEntity} from "./CoreEntity";
import {GlobalFilter, Relation} from "../../common/decorators/mvc.decorator";
import {UniqueValidate} from "../../common/validators/unique.validator";
import {IsNotEmpty} from "class-validator";
import {Province} from "./Province";
import {City} from "./City";
import { Audit } from '../../common/decorators/audit.decorator';

@Audit()
@Relation({
    findAll: ["province", "city"],
    get: ["province", "city"],
    autoComplete: ["province", "city"],
})
@Entity({name: '_urban_area'})
export class UrbanArea extends CoreEntity {
    @IsNotEmpty()
    @UniqueValidate(UrbanArea)
    @GlobalFilter({where: (param: string) => Like(`%${param}%`)})
    @Column({name: 'title'})
    title?: string = "";

    @ManyToOne(() => City)
    @JoinColumn({name: 'city'})
    city: City;

    @RelationId((area: UrbanArea) => area.city)
    cityId: number;

    @ManyToOne(() => Province)
    @JoinColumn({name: 'province'})
    province: Province;

    @RelationId((area: UrbanArea) => area.province)
    provinceId: number;
}
