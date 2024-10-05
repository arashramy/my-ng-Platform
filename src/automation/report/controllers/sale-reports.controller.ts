import { Controller, Get, Query } from '@nestjs/common';
import { LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { plainToInstance } from 'class-transformer';
import { ReceptionChartReportDto } from '../dto/ReceptionReportDto';
import moment from 'moment-jalaali';
import { Setting, SettingKey } from '../../../base/entities/Setting';
import { AppConstant } from '../../../common/constant/app.constant';
import { common_permissions } from '../../../common/controller/base.controller';
import {
  PermissionAction,
  PermissionKey,
} from '../../../common/constant/auth.constant';
import { SaleOrderReport } from '../entities/SaleOrderReport';
import { Product } from '../../../automation/base/entities/Product';

export enum ReceptionReportType {
  hour,
  dayOfWeek,
  month,
  season,
  year,
  product,
}

@Permissions([
  ...common_permissions,
  PermissionKey.REPORT_RECEPTION,
  `${PermissionKey.REPORT_RECEPTION}_${PermissionAction.READ}`,
])
@Controller('/api/reports')
export class SaleReportsController {
  @Get()
  async report(
    @Query('user') user: number,
    @Query('season') season: number,
    @Query('month') month: number,
    @Query('dayOfWeek') dayOfWeek: number,
    @Query('year') year: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('product') product: number,
    @Query('type') type: ReceptionReportType = ReceptionReportType.hour,
    @Query('saleUnit') saleUnit: number,
  ): Promise<ReceptionChartReportDto[]> {
    let isJalali =
      ((await Setting.findByKey(SettingKey.SystemConfig))?.calendar ||
        AppConstant.DEFAULT_CALENDAR) != 'gregorian';
    let where: any = {};
    // if (service) {
    //   where['service'] = service;
    // }
    if (user) {
      where['user'] = user;
    }

    if (product || product === 0) {
      where['product'] = product;
    }

    if (season) {
      where['season'] = season;
    }
    if (month) {
      where[isJalali ? 'monthJalali' : 'monthGeorg'] = month;
    }
    if (dayOfWeek) {
      where['dayOfWeek'] = dayOfWeek;
    }
    if (year) {
      let yearM = moment(year, 'YYYY-MM-DD');
      where[isJalali ? 'yearJalali' : 'yearGeorg'] = isJalali
        ? yearM.jYear()
        : yearM.year();
    }
    if (start) {
      where['date'] = MoreThanOrEqual(start);
    }
    if (end) {
      where['date'] = LessThanOrEqual(end);
    }

    if (saleUnit || saleUnit == 0) {
      where['saleUnit'] = saleUnit;
    }

    let selects: any = {};
    let joins: any[] = [];
    let groups: string[] = [];
    switch (type) {
      case ReceptionReportType.hour:
        selects = {
          h0: 'SUM(h_0)',
          h1: 'SUM(h_1)',
          h2: 'SUM(h_2)',
          h3: 'SUM(h_3)',
          h4: 'SUM(h_4)',
          h5: 'SUM(h_5)',
          h6: 'SUM(h_6)',
          h7: 'SUM(h_7)',
          h8: 'SUM(h_8)',
          h9: 'SUM(h_9)',
          h10: 'SUM(h_10)',
          h11: 'SUM(h_11)',
          h12: 'SUM(h_12)',
          h13: 'SUM(h_13)',
          h14: 'SUM(h_14)',
          h15: 'SUM(h_15)',
          h16: 'SUM(h_16)',
          h17: 'SUM(h_17)',
          h18: 'SUM(h_18)',
          h19: 'SUM(h_19)',
          h20: 'SUM(h_20)',
          h21: 'SUM(h_21)',
          h22: 'SUM(h_22)',
          h23: 'SUM(h_23)',
        };
        break;
      case ReceptionReportType.dayOfWeek:
        groups.push('q.dayOfWeek');
        selects = {
          id: 'q.dayOfWeek',
          title: 'q.dayOfWeek',
          data: 'SUM(q.quantity)',
        };
        break;
      case ReceptionReportType.month:
        groups.push(isJalali ? 'q.monthJalali' : 'q.monthGeorg');
        selects = {
          id: isJalali ? 'q.monthJalali' : 'q.monthGeorg',
          title: isJalali ? 'q.monthJalali' : 'q.monthGeorg',
          data: 'SUM(q.quantity)',
        };
        break;
      case ReceptionReportType.season:
        groups.push('q.season');
        selects = {
          id: 'q.season',
          title: 'q.season',
          data: 'SUM(q.quantity)',
        };
        break;
      case ReceptionReportType.year:
        groups.push(isJalali ? 'q.yearJalali' : 'q.yearGeorg');
        selects = {
          id: isJalali ? 'q.yearJalali' : 'q.yearGeorg',
          title: isJalali ? 'q.yearJalali' : 'q.yearGeorg',
          data: 'SUM(q.quantity)',
        };
        break;
      case ReceptionReportType.product:
        groups.push('q.product');
        groups.push('s.title');
        selects = {
          id: 'q.product',
          title: 's.title',
          data: 'SUM(q.quantity)',
        };
        joins.push({
          entity: Product,
          alias: 's',
          on: 's.id=q.product',
        });
    }
    let query = SaleOrderReport.createQueryBuilder('q').select([]);
    for (let entry of Object.entries(selects)) {
      query.addSelect(entry[1] as string, entry[0]);
    }
    console.log('where', where);
    query.where(where);
    for (let join of joins) {
      console.log(join.entity, join.alias, join.on);
      query.leftJoin(join.entity, join.alias, join.on);
    }
    for (let group of groups) {
      query.addGroupBy(group);
    }

    if (type == ReceptionReportType.hour) {
      let result = await query.getRawOne();
      return Object.entries(result).map((entry, index) => {
        let id = entry[0].replace('h', '');
        let next = `${+id + 1}`.padStart(2, '0');
        let out: ReceptionChartReportDto = {
          id: +id,
          title: `${id.padStart(2, '0')}:00-${next}:00`,
          data: +entry[1],
        };
        return out;
      });
    }
    return (await query.getRawMany()).map((d) =>
      plainToInstance(ReceptionChartReportDto, d),
    );
  }
}
