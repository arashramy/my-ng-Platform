import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import { common_permissions } from '../../../common/controller/base.controller';
import {
  PermissionAction,
  PermissionKey
} from '../../../common/constant/auth.constant';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentOrgUnit } from '../../../common/decorators/current-org-unit.decorator';
import { CurrentFiscalYear } from '../../../common/decorators/current-fiscal-year.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../base/entities/User';
import { ExcelService } from '../../../common/export/ExcelService';
import { Response } from 'express';
import { TurnoverExcel } from '../service/turnover-export.service';
import { TurnoverReportService } from '../service/turnover-report.service';
import { Transaction } from '../../operational/entities/Transaction';
import { Between, Equal, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import moment from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';

@Permissions([
  ...common_permissions,
  PermissionKey.AUTOMATION_REPORT_TURNOVER,
  `${PermissionKey.AUTOMATION_REPORT_TURNOVER}_${PermissionAction.READ}`
])
@Controller('/api/reports/turnover')
export class TurnoverReportsController {
  constructor(
    private excelService: ExcelService,
    private readonly turnoverExcel: TurnoverExcel,
    private readonly turnoverReportService: TurnoverReportService
  ) {}

  @Get()
  async getTurnover(
    @Query() params: any,
    @CurrentOrgUnit({ headerOnly: true }) orgUnit: number,
    @CurrentFiscalYear({ headerOnly: true }) fiscalYear: number,
    @CurrentUser() current: User
  ): Promise<any> {
    let where = this.turnoverReportService.prepareConditions(
      params,
      orgUnit,
      fiscalYear,
      current
    );
    return {
      orders: await this.turnoverReportService.orders(params, { ...where }),
      transactions: await this.turnoverReportService.transactions(params, {
        ...where
      }),
      discounts: await this.turnoverReportService.discount(params, {
        ...where
      }),
      saleItems: await this.turnoverReportService.saleItems(params, {
        ...where
      }),
      tags: await this.turnoverReportService.tags(params, { ...where }),
      taxs: await this.turnoverReportService.taxs(params, { ...where }),
      notSettled: await this.turnoverReportService.notSettled(params, {
        ...where
      }),
      transferSaleItem: await this.turnoverReportService.transferSaleItems(
        params,
        { ...where }
      )
    };
  }

  @Get('/export')
  @Header('Content-Type', 'text/xlsx')
  async getExportData(
    @Query() params: any,
    @CurrentOrgUnit({ headerOnly: true }) orgUnit: number,
    @CurrentFiscalYear({ headerOnly: true }) fiscalYear: number,
    @CurrentUser() current: User,
    @Res() res: Response
  ) {
    const ex = await this.turnoverExcel.excel(
      params,
      params.exportType,
      orgUnit,
      fiscalYear,
      current,
      res
    );
    res.download(ex.name);
  }

  @Get('/trx')
  async getTurnoverTransaction(@Query() params: any) {
    let where = {};
    if (params['submitAt.gte']) {
      let start = moment(params['submitAt.gte']).format(
        AppConstant.DATETIME_FORMAT
      );
      where['submitAt'] = MoreThanOrEqual(start);
    }
    if (params['submitAt.lte']) {
      let end = moment(params['submitAt.lte']).format(
        AppConstant.DATETIME_FORMAT
      );
      where['submitAt'] = LessThanOrEqual(end);
    }

    if (params['submitAt.lte'] && params['submitAt.gte']) {
      let start = new Date(
        moment(params['submitAt.gte']).format(AppConstant.DATETIME_FORMAT)
      ).toISOString();
      let end = new Date(
        moment(params['submitAt.lte']).format(AppConstant.DATETIME_FORMAT)
      ).toISOString();
      console.log(start, end);
      if (end && start) {
        where['submitAt'] = Between(start, end);
      }
    }

    if (params['source'] || params['source'] === 0) {
      where['source'] = Equal(+params['source']);
    }

    if (params['sourceType'] || params['sourceType'] === 0) {
      where['sourceType'] = Equal(+params['sourceType']);
    }

    if (params['type'] || params['type'] === 0) {
      where['type'] = Equal(+params['type']);
    }

    if (params['user.equals']) {
      where['user'] = { id: +params['user.equals'] };
    }

    if (params['createdBy.equals']) {
      where['createdBy'] = { id: +params['createdBy.equals'] };
    }

    if (params['shiftWork.equals']) {
      where['shiftWork'] = { id: +params['shiftWork.equals'] };
    }

    if (params['organizationUnit.equals']) {
      where['organizationUnit'] = { id: +params['organizationUnit.equals'] };
    }

    if (params['saleUnit.equals']) {
      where['saleUnit'] = { id: +params['saleUnit.equals'] };
    }

    if (params['saleUnit.in']) {
      where['saleUnit'] = {
        id: In([...params['saleUnit.in'].split(',').map((e: any) => +e)])
      };
    }

    if (params['createdAt.gte']) {
      where['createdAt'] = MoreThanOrEqual(moment(params['createdAt.gte']));
    }

    if (params['createdAt.lte']) {
      let endCreatedAt = moment(params['createdAt.lte'])
        .add(1, 'day')
        .format(AppConstant.DATE_FORMAT);
      where['createdAt'] = LessThanOrEqual(endCreatedAt);
    }

    if (params['createdAt.lte'] && params['createdAt.gte']) {
      let endCreatedAt = new Date(moment(params['createdAt.lte'])
        .add(1, 'day')
        .format(AppConstant.DATETIME_FORMAT)).toISOString();
      let startCreatedAt = new Date(moment(params['createdAt.gte']).format(
        AppConstant.DATETIME_FORMAT
      )).toISOString();
      console.log('createsat',endCreatedAt,startCreatedAt)

      where['createdAt'] = Between(startCreatedAt, endCreatedAt);
    }

    if (params['amount.gte']) {
      where['amount'] = MoreThanOrEqual(params['amount.gte']);
    }

    if (params['amount.lte']) {
      where['amount'] = LessThanOrEqual(params['amount.lte']);
    }

    if (params['amount.lte'] && params['amount.gte']) {
      where['amount'] = Between(params['amount.gte'], params['amount.lte']);
    }

    console.log('the paramss is', params, where);

    const query = Transaction.createQueryBuilder('q')
      .select([])
      .leftJoin('q.user', 'user')
      .leftJoin('q.shiftWork', 'shiftWork')
      .leftJoin('q.organizationUnit', 'organizationUnit')
      .leftJoin('q.saleUnit', 'saleUnit')
      .addSelect('user.id', 'userId')
      .addSelect('user.first_name', 'firstName')
      .addSelect('user.last_name', 'lastName')
      .addSelect('user.mobile', 'mobile')
      .addSelect('user.credit', 'credit')
      .addSelect('q.source', 'source')
      .addSelect('user.code', 'code')
      .addSelect('SUM(q.amount)', 'amount')
      .addSelect('COUNT(q.id)', 'quantity')
      .addSelect('min(q.createdAt)', 'createdAt')
      .addSelect('q.title', 'title')
      .where(where)
      .groupBy('user.id')
      .addGroupBy('q.source')
      // .addGroupBy("TO_CHAR(q.submitAt, 'YYYY-MM-DD HH:mm')")
      .addGroupBy('q.title');



      
    const total = (await query.getRawMany()).length;
    const content = await query
      .clone()
      .limit(+params.limit || 10)
      .offset(+params.offset || 0)
      .getRawMany();

    return { content, total };
  }
}
