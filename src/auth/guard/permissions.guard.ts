import { CanActivate, ExecutionContext, mixin, Type } from '@nestjs/common';
import { AccessTokenGuard } from './access-token.guard';

export const PermissionsGuard = (permissions: string[]): Type<CanActivate> => {
  class PermissionsGuardMixin extends AccessTokenGuard {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      let access = await super.canActivate(context);
      if (!permissions) {
        return true;
      }

      const user = context.switchToHttp().getRequest().user;
      return permissions.some((permission) =>
        user.permissions?.includes(permission)
      );
    }
  }
  return mixin(PermissionsGuardMixin);
};
