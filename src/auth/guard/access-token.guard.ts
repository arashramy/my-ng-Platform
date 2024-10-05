import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { CheckPlan } from './check.plan';
import { TokenStoreService } from '../service/token-store.service';

@Injectable()
export class AccessTokenGuard extends AuthGuard('jwt') {
  constructor(
    private tokenStore: TokenStoreService,
    private checkPlan: CheckPlan,
    private reflect: Reflector
  ) {
    console.log("imrunn as constructor ");
    super();
  }
  

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const disable = !!this.reflect.get(
      'disable-auth-guard',
      context.getHandler()
    );
    if (disable) {
      return true;
    }

    if (process.env.CHECK_PLAN) {
      const expired = await this.checkPlan.checkExpire();
      if (!expired) return false;
    }

    let auth = await super.canActivate(context);
    const user = context.switchToHttp().getRequest().user;
    if (!auth || !user) throw new UnauthorizedException();
    const token = context
      .switchToHttp()
      .getRequest()
      .get('Authorization')
      .replace('Bearer', '')
      .trim();
    const stored = await this.tokenStore.getSecretToken(user.sub);
    if (stored !== token) {
      throw new UnauthorizedException('Unable Access');
    }
    return true;
  }
}
