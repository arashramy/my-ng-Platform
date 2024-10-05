import {CanActivate, ExecutionContext, Type, mixin} from '@nestjs/common';

import {AccessTokenGuard} from "./access-token.guard";

export const RolesGuard = (roles:string[]):Type<CanActivate> =>{
    class RolesGuardMixin extends AccessTokenGuard{
        async canActivate(context: ExecutionContext): Promise<boolean> {
            await super.canActivate(context);
            if (!roles) {
                return true;
            }
            const user = context.switchToHttp().getRequest().user;
            return roles.some((role) => user.roles?.includes(role));
        }
    }
    return mixin(RolesGuardMixin);
}