import {createParamDecorator, ExecutionContext} from '@nestjs/common';
import {AppConstant} from "../constant/app.constant";
import {JwtPayload} from "../../auth/dto/JwtPayload";
import {Role} from "../../base/entities/User";

export const CurrentFiscalYear = createParamDecorator(
    async (options: { headerOnly: boolean }, ctx: ExecutionContext) => {
        const user: JwtPayload = ctx.switchToHttp().getRequest().user;
        if (!user) {
            return null;
        }
        let fiscalYear = +ctx.switchToHttp().getRequest().header(AppConstant.FISCAL_YEAR_HEADER_NAME);
        if (fiscalYear) {
            if (user.roles?.includes(Role.Admin) || user?.accessFiscalYears?.includes(fiscalYear)) {
                return fiscalYear;
            }
        }
        if (!options?.headerOnly)
            return user?.accessFiscalYears;
        return null;
    },
);
