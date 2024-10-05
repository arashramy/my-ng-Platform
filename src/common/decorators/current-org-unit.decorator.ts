import {createParamDecorator, ExecutionContext} from '@nestjs/common';
import {AppConstant} from "../constant/app.constant";
import {JwtPayload} from "../../auth/dto/JwtPayload";
import {Role} from "../../base/entities/User";

export const CurrentOrgUnit = createParamDecorator(
    async (options: { headerOnly: boolean }, ctx: ExecutionContext) => {
        const user: JwtPayload = ctx.switchToHttp().getRequest().user;
        if (!user) {
            return null;
        }
        let orgUnitValue = +ctx.switchToHttp().getRequest().header(AppConstant.ORG_UNIT_HEADER_NAME)
        if (orgUnitValue) {
            if (user.roles?.includes(Role.Admin) || user?.accessOrganizationUnits?.includes(orgUnitValue)) {
                return orgUnitValue;
            }
        }
        if (!options?.headerOnly)
            return user?.accessOrganizationUnits;
        return null;
    },
);
