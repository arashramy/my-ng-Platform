import { Controller, Get, Query } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import moment from 'moment';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { SaleOrder } from '../../../automation/operational/entities/SaleOrder';
import { User } from '../../../base/entities/User';
import { AppConstant } from '../../../common/constant/app.constant';
import { CurrentFiscalYear } from '../../../common/decorators/current-fiscal-year.decorator';
import { CurrentOrgUnit } from '../../../common/decorators/current-org-unit.decorator';
import { Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { TransactionTurnover } from '../dto/TurnoverDto';
import { SaleItem } from '../../../automation/operational/entities/SaleItem';
import { common_permissions } from '../../../common/controller/base.controller';
import {
  PermissionAction,
  PermissionKey
} from '../../../common/constant/auth.constant';
import { Permissions } from '../../../auth/decorators/permissions.decorator';

@Permissions([
  ...common_permissions,
  PermissionKey.AUTOMATION_REPORT_USER_TRAFFIC,
  `${PermissionKey.AUTOMATION_REPORT_USER_TRAFFIC}_${PermissionAction.READ}`
])
@Controller('/api/user/traffic/report')
export class UserTrafficReport {
  @Get('/detail')
  async ReceptiondetailReport(
    @Query() params: any,
    @CurrentOrgUnit({ headerOnly: true }) orgUnit: number,
    @CurrentFiscalYear({ headerOnly: true }) fiscalYear: number,
    @CurrentUser() current: User
  ) {
    const where = this.prepareConditions(params, orgUnit, fiscalYear, current);
    if (where.submitAt) {
      delete where.submitAt;
    }

    console.log('eeeeee');

    const query = await SaleItem.createQueryBuilder('q')
      .select([])
      .leftJoin('q.product', 'product')
      .leftJoin('q.saleUnit', 'saleUnit')
      .leftJoin('q.user', 'user')
      .leftJoin('q.saleOrder', 'saleOrder')
      .addSelect('product.id', 'product')
      .addSelect('saleUnit.id', 'saleUnitId')
      .addSelect('product.title', 'title')
      .addSelect('SUM(q.quantity)', 'quantity')
      .addSelect('COUNT(q.id)', 'count')
      .addSelect("TO_CHAR(q.submit_at, 'YYYY-MM-DD')", 'submitAt')
      .where("TO_CHAR(q.submit_at, 'YYYY-MM-DD')=:submitAt", {
        submitAt: params.submitAt
      })
      .andWhere(where)
      .andWhere('saleOrder.reception=true')
      .groupBy('product.id')
      .addGroupBy('saleUnit.id')
      .addGroupBy("TO_CHAR(q.submitAt, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(q.submitAt, 'YYYY-MM-DD')");

      const total = await query.clone();
      const content = await query
      .offset(params.offset || 0)
      .limit(params.limit|| 10)
      .getRawMany();
      
    return { content, total:(await total.getRawMany()).length };
  }

  @Get('')
  async get(
    @Query() params: any,
    @CurrentOrgUnit({ headerOnly: true }) orgUnit: number,
    @CurrentFiscalYear({ headerOnly: true }) fiscalYear: number,
    @CurrentUser() current: User
  ) {
    const where = this.prepareConditions(params, orgUnit, fiscalYear, current);
    return (
      await SaleOrder.createQueryBuilder('q')
        .select([])
        .leftJoin('q.saleUnit', 'saleUnit')
        .leftJoin('q.items', 'items')
        .addSelect('saleUnit.title', 'title')
        .addSelect("TO_CHAR(q.submit_at, 'YYYY-MM-DD')", 'submitAt')
        .addSelect('COUNT(q.quantity)', 'count')
        .addSelect('SUM(items.persons)', 'persons')
        .addSelect('saleUnit.id', 'saleUnitId')
        .where('q.reception=true')
        .andWhere(where)
        .orderBy("TO_CHAR(q.submit_at, 'YYYY-MM-DD')", 'DESC')
        .groupBy('saleUnit.id')
        .addGroupBy("TO_CHAR(q.submit_at, 'YYYY-MM-DD')")
        .addGroupBy('saleUnit.title')
        .getRawMany()
    ).map((obj) => plainToInstance(TransactionTurnover, obj));
  }

  prepareConditions(
    params: any,
    orgUnit: number,
    fiscalYear: number,
    current: User
  ) {
    let where: any = {};

    if (orgUnit) {
      where['organizationUnit'] = { id: orgUnit };
    } else if (!current?.isAdmin()) {
      where['organizationUnit'] = {
        id: In(current?.accessOrganizationUnits?.map((s) => s.id) || [])
      };
    }
    if (fiscalYear) {
      where['fiscalYear'] = { id: fiscalYear };
    } else if (!current.isAdmin()) {
      where['fiscalYear'] = {
        id: In(current?.accessFiscalYears?.map((s) => s.id) || [])
      };
    }
    let startMoment = moment(
      params?.start ? params?.start : moment().startOf('day'),
      AppConstant.DATETIME_FORMAT
    );
    if (startMoment.isValid()) {
      where['submitAt'] = MoreThanOrEqual(startMoment);
    }

    console.log('startMoment', startMoment);

    if (params.end) {
      let endMoment = moment(
        `${params.end} 00:00`,
        AppConstant.SUBMIT_TIME_FORMAT
      );
      if (endMoment.isValid()) {
        where['submitAt'] = LessThanOrEqual(endMoment.add(1, 'day').toDate());
      }
    }
    if (params.operator) {
      where['createdBy'] = { id: +params.operator };
    }
    if (params.user) {
      where['user'] = { id: +params.user };
    }

    if (params.saleUnit) {
      where['saleUnit'] = { id: +params.saleUnit };
    } else if (!current.isAdmin()) {
      where['saleUnit'] = {
        id: In(current.accessShops?.map((e) => e.id) || [])
      };
    }

    if (params.orgUnit) {
      where['organizationUnit'] = { id: +params.orgUnit };
    } else if (!current.isAdmin()) {
      where['organizationUnit'] = {
        id: In(current.accessOrganizationUnits?.map((e) => e.id) || [])
      };
    }

    if (params.shiftWork) {
      where['shiftWork'] = { id: +params.shiftWork };
    } else if (!current.isAdmin()) {
      // where['shiftWork']=In(current.schedules.map)
    }

    if (params.type != undefined) {
      where['type'] = +params.type;
    }

    if (params?.end && params?.start) {
      let startMoment = moment(
        `${params.start} 00:00`,
        AppConstant.SUBMIT_TIME_FORMAT
      );
      let endMoment = moment(
        `${params.end} 00:00`,
        AppConstant.SUBMIT_TIME_FORMAT
      );
      if (endMoment.isValid() && startMoment.isValid()) {
        where['submitAt'] = Between(
          startMoment.toDate(),
          endMoment.add(1, 'day').toDate()
        );
      }
    }
    return where;
  }
}
