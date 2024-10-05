import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  NestInterceptor
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { FiscalYear } from '../../base/entities/FiscalYears';
import { OrganizationUnit } from '../../base/entities/OrganizationUnit';
import { Role, User } from '../../base/entities/User';
import { AppConstant } from '../../common/constant/app.constant';
import { LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { JwtPayload } from '../../auth/dto/JwtPayload';

export class Operation {
  organizationUnit?: OrganizationUnit | number;
  fiscalYear?: FiscalYear | number;
}

export interface AccessOrganizationFiscalYearPayload {
  ignoreStep?: ('orgUnit' | 'fiscalYear')[];
  orgUnitFieldName?: string;
  fiscalYearFieldName?: string;
  injectParty?: 'param' | 'query' | 'body';
}

export class AccessOrganizationFiscalYearInterceptor
  implements NestInterceptor
{
  private payload: AccessOrganizationFiscalYearPayload;
  constructor(payload: AccessOrganizationFiscalYearPayload) {
    this.payload = payload;
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any> | any> {
    const request = context.switchToHttp().getRequest() as Request & {
      user: User | JwtPayload;
    };
    const user = request.user;
    const dto = request.body;
    const orgUnitFieldName =
      this?.payload?.orgUnitFieldName || 'organizationUnit';
    const fiscalYearFieldName =
      this?.payload?.fiscalYearFieldName || 'fiscalYear';

    const data: { [key: string]: any } = {
      [orgUnitFieldName]: dto[orgUnitFieldName],
      [fiscalYearFieldName]: dto[fiscalYearFieldName]
    };
    if (!this?.payload?.ignoreStep?.includes('orgUnit')) {
      data[orgUnitFieldName] ||= +request.header(
        AppConstant.ORG_UNIT_HEADER_NAME
      ) as number;
      if (
        !user.roles.includes(Role.Admin) &&
        typeof data[orgUnitFieldName] == 'number' &&
        !user?.accessOrganizationUnits?.includes(data[orgUnitFieldName])
      ) {
        throw new ForbiddenException('Unable access to organization');
      }
    }
    if (!this?.payload?.ignoreStep?.includes('fiscalYear')) {
      data[fiscalYearFieldName] ||= +request.header(
        AppConstant.FISCAL_YEAR_HEADER_NAME
      ) as number;
      if (data[fiscalYearFieldName]) {
        try {
          data[fiscalYearFieldName] = await FiscalYear.findOneOrFail({
            where: { id: data[fiscalYearFieldName] as number }
          });
        } catch (error) {
          throw new BadRequestException('fiscal year is invalid');
        }
      } else {
        const today = new Date();
        try {
          data[fiscalYearFieldName] = await FiscalYear.findOne({
            where: {
              end: MoreThanOrEqual(today),
              start: LessThanOrEqual(today)
            }
          });
        } catch (error) {
          throw new BadRequestException('fiscal year is invalid');
        }
      }
    }

    const injectPartyPayload = this?.payload?.injectParty || 'body';
    request[injectPartyPayload] = {
      ...(request[injectPartyPayload] || {}),
      ...data
    };

    return next.handle();
  }
}
