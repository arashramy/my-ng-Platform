import {ExecutionContext, Inject, Injectable} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {Observable} from 'rxjs';
import {CheckPlan} from './check.plan';

@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {
}
