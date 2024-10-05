import {In, JoinColumn, ManyToOne, RelationId} from "typeorm";
import {OrganizationUnit} from "./OrganizationUnit";
import {FiscalYearBaseEntity} from "./FiscalYearBaseEntity";
import {OrganizationUnitFilter} from "../../common/decorators/mvc.decorator";

export abstract class OrganizationUnitByFiscalYearBaseEntity extends FiscalYearBaseEntity {
    @OrganizationUnitFilter()
    @JoinColumn({name: "org_unit"})
    @ManyToOne(() => OrganizationUnit)
    organizationUnit?: OrganizationUnit;
    @RelationId((object: OrganizationUnitByFiscalYearBaseEntity) => object.organizationUnit)
    organizationUnitId?: number;
}