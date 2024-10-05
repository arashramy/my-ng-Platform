import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { SaleItem } from '../../../automation/operational/entities/SaleItem';
import { User } from '../../../base/entities/User';
import {
  PermissionAction,
  PermissionKey
} from '../../../common/constant/auth.constant';
import { common_permissions } from '../../../common/controller/base.controller';
import moment from 'moment';
import { plainToInstance } from 'class-transformer';
import { LostServiceDetailDto, LostServiceDto } from '../dto/TurnoverDto';

@Permissions([
  ...common_permissions,
  PermissionKey.AUTOMATION_REPORT_REGISTERED_SERVICE,
  `${PermissionKey.AUTOMATION_REPORT_REGISTERED_SERVICE}_${PermissionAction.READ}`
])
@Controller('/api/reports/lost-service')
export class RegisteredServiceReportController {
  @Get('/totals')
  async getRegisterdserviceReportCount(
    @Query() params: any,
    @CurrentUser() current: User
  ) {
    const query = SaleItem.createQueryBuilder('q')
      .where('q.type in (1,2)')
      .select([])
      .leftJoin('q.contractor', 'contractor')
      .leftJoin('q.product', 'product')
      .leftJoin('q.saleUnit', 'saleUnit')
      .addSelect('COUNT(q.id)', 'count')
      // .addSelect(
      //   'SUM(CASE WHEN q.type=1 THEN q.price*(q.credit-q.used_credit) ELSE (q.credit-q.used_credit) end)',
      //   'totalAmount'
      // )

      .addSelect(
        'SUM(CASE WHEN q.type=1 AND q.unlimited=false THEN q.price*(q.credit-q.used_credit) WHEN q.type=2 THEN (q.credit-q.used_credit) ELSE 0 END)'
      )

      .addSelect('q.type', 'type');

    if (params['end.lte'] && params['end.gte']) {
      query.andWhere('q.end  BETWEEN :startDate AND :endDate', {
        startDate: params['end.gte'],
        endDate: moment(params['end.lte']).startOf('day').add(1, 'day')
      });
    } else if (params['end.lte']) {
      query.andWhere('q.end <= :startDate', { startDate: params['end.lte'] });
    } else if (params['end.gte']) {
      query.andWhere('q.end >= :startDate', { startDate: params['end.gte'] });
    }

    if (
      typeof params['isCashBack.equals'] != typeof undefined &&
      typeof params['isGift.equals'] != typeof undefined
    ) {
      query.andWhere('(q.isCashBack= :isCashBack OR q.isGift= :isGift)', {
        isCashBack: params['isCashBack.equals'],
        isGift: params['isGift.equals']
      });
    }


    query.andWhere('q.credit - q.used_credit >0');

    return (await query.groupBy('q.type').getRawMany()).map((obj) =>
      plainToInstance(LostServiceDto, obj)
    );
  }

  @Get('/page')
  async getRegisterdserviceReportDetail(
    @Query() params: any,
    @CurrentUser() current: any
  ) {
    const query = SaleItem.createQueryBuilder('q').where('q.type in (1,2)');

    if (params['end.lte'] && params['end.gte']) {
      query.andWhere('q.end  BETWEEN :startDate AND :endDate', {
        startDate: params['end.gte'],
        endDate: moment(params['end.lte']).startOf('day').add(1, 'day')
      });
    } else if (params['end.lte']) {
      query.andWhere('q.end <= :startDate', { startDate: params['end.lte'] });
    } else if (params['end.gte']) {
      query.andWhere('q.end >= :startDate', { startDate: params['end.gte'] });
    }

    query.andWhere('q.credit - q.usedCredit >0');

    const total = query.clone();
    total
      .leftJoin('q.contractor', 'contractor')
      .leftJoin('q.product', 'product')
      .leftJoin('q.saleUnit', 'saleUnit')
      .leftJoin('q.user', 'user');

    query
      .leftJoinAndSelect('q.contractor', 'contractor')
      .leftJoinAndSelect('q.product', 'product')
      .leftJoinAndSelect('q.saleUnit', 'saleUnit')
      .leftJoinAndSelect('q.user', 'user');

    if (params.contractor) {
      query.andWhere('q.contractor = :contractor', {
        contractor: params.contractor
      });
      total.andWhere('q.contractor = :contractor', {
        contractor: params.contractor
      });
    }
    if (params.user) {
      query.andWhere('q.user = :user', {
        user: params.user
      });
      total.andWhere('q.user = :user', {
        user: params.user
      });
    }

    if (params.product) {
      query.andWhere('q.product = :product', {
        product: params.product
      });
      total.andWhere('q.product = :product', {
        product: params.product
      });
    }

    if (params.type) {
      query.andWhere('q.type = :type', {
        type: params.type
      });
      total.andWhere('q.type = :type', {
        type: params.type
      });
    }

    if (
      typeof params['isCashBack.equals'] != typeof undefined &&
      typeof params['isGift.equals'] != typeof undefined
    ) {
      query.andWhere('(q.isCashBack= :isCashBack OR q.isGift= :isGift)', {
        isCashBack: params['isCashBack.equals'],
        isGift: params['isGift.equals']
      });
    }


    if (params.sortField && params.sortOrder) {
      query
        .orderBy()
        .addOrderBy(
          'q.' + params.sortField,
          +params.sortOrder === 1 ? 'ASC' : 'DESC'
        );
    }

    const result = await query
      .skip(+params.offset || 0)
      .take(+params.limit || 10)
      .getManyAndCount();

    const report = await total
      .select([])
      .addSelect(
        'SUM(CASE WHEN q.type=1 THEN q.credit-q.used_credit ELSE 0 END)',
        'registeredCount'
      )
      .addSelect(
        'SUM(CASE WHEN q.type=1 AND q.unlimited=false THEN q.price*(q.credit-q.used_credit) WHEN q.type=2 THEN (q.credit-q.used_credit) ELSE 0 END)'
      )

      .getRawOne();

    return {
      content: result[0],
      total: result[1],
      report: {
        registeredCount: +report.registeredCount,
        totalAmount: +report.totalAmount
      }
    };
  }
}
