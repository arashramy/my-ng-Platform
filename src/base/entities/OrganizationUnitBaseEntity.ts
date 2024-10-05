import {In, JoinColumn, ManyToOne, RelationId} from "typeorm";
import {OrganizationUnit} from "./OrganizationUnit";
import {CoreEntity} from "./CoreEntity";
import {OrganizationUnitFilter} from "../../common/decorators/mvc.decorator";

export abstract class OrganizationUnitBaseEntity extends CoreEntity {
    @OrganizationUnitFilter()
    @JoinColumn({name: "org_unit"})
    @ManyToOne(() => OrganizationUnit)
    organizationUnit?: OrganizationUnit;

    @RelationId((object: OrganizationUnitBaseEntity) => object.organizationUnit)
    organizationUnitId?: number;
}