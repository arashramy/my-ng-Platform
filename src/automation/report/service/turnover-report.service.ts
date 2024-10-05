import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import moment from 'moment';
import { Transaction } from '../../../automation/operational/entities/Transaction';
import { User } from '../../../base/entities/User';
import { AppConstant } from '../../../common/constant/app.constant';
import { Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { OrderTurnover, TransactionTurnover } from '../dto/TurnoverDto';
import { SaleItem } from '../../../automation/operational/entities/SaleItem';

@Injectable()
export class TurnoverReportService {
  async transactions(params: any, where: any) {
    if (params.source != undefined) {
      where['source'] = +params.source;
    }
    return (
      await Transaction.createQueryBuilder('q')
        .select([])
        .addSelect('q.type', 'type')
        .addSelect('q.saleUnit', 'saleUnitId')
        .addSelect('saleUnit.title', 'saleUnit')
        .addSelect('q.installmentLoan', 'installmentLoanId')
        .addSelect('q.sourceType', 'sourceType')
        .addSelect('q.source', 'source')
        .addSelect('q.title', 'sourceTitle')
        .addSelect('count(q.id)', 'count')
        .addSelect('SUM(q.amount)', 'amount')
        .leftJoin('q.saleUnit', 'saleUnit')
        .leftJoin('q.installmentLoan', 'installmentLoan')
        .where(where)
        .groupBy('q.type')
        .addGroupBy('q.saleUnit')
        .addGroupBy('saleUnit.title')
        .addGroupBy('q.sourceType')
        .addGroupBy('q.source')
        .addGroupBy('q.title')
        .addGroupBy('q.installmentLoan')
        .addGroupBy('installmentLoan.id')
        .getRawMany()
    ).map((obj) => plainToInstance(TransactionTurnover, obj));
  }

  async orders(params: any, where: any) {
    if (params.shiftWork) {
      delete where.shiftWork;
    }

    if (where.submitAt) {
      where['saleOrder'] = { submitAt: where['submitAt'] };
    }
    delete where['submitAt'];
    const query = await SaleItem.createQueryBuilder('q')
      .select([])

      .addSelect('q.type', 'type')
      .addSelect('count(q.id)', 'count')
      .addSelect('SUM(q.quantity)', 'quantity')
      .addSelect(
        'SUM(q.amount * q.quantity) + SUM(((q.amount * q.quantity) - q.discount - q.return_credit) * q.tax / 100) - SUM(q.discount)',
        'amount'
      )
      .leftJoin('q.saleUnit', 'saleUnit')
      .leftJoin('q.saleOrder', 'saleOrder')

      .where(where)
      .andWhere('q.parent is null')
      .andWhere('q.saleOrder is not null');

    if (params.shiftWork) {
      query.andWhere('saleOrder.shiftWork=:shiftWork', {
        shiftWork: +params.shiftWork
      });
    }

    return await query
      .addSelect('saleUnit.id', 'id')
      .addSelect('saleUnit.title', 'title')
      .groupBy('saleUnit.id')
      .addGroupBy('saleUnit.title')
      .addGroupBy('q.type')
      .getRawMany();
  }

  async notSettled(params: any, where: any) {
    if (params.shiftWork) {
      delete where.shiftWork;
    }
    if (where.submitAt) {
      where['saleOrder'] = { submitAt: where['submitAt'] };
    }
    delete where['submitAt'];
    const query = await SaleItem.createQueryBuilder('q')
      .select([])

      .addSelect('q.type', 'type')
      .addSelect('count(q.id)', 'count')
      .addSelect('SUM(q.quantity)', 'quantity')
      .addSelect(
        'SUM(q.amount * q.quantity) + SUM(((q.amount * q.quantity) - q.discount - q.return_credit) * q.tax / 100) - SUM(q.discount)',
        'amount'
      )
      .leftJoin('q.saleUnit', 'saleUnit')
      .leftJoin('q.saleOrder', 'saleOrder')
      .where(where)
      .andWhere('q.parent is null')
      .andWhere('q.saleOrder is not null');

    if (params.shiftWork) {
      query.andWhere('saleOrder.shiftWork=:shiftWork', {
        shiftWork: +params.shiftWork
      });
    }

    const notSettled = query;
    return await notSettled
      .addSelect('saleUnit.id', 'id')
      .addSelect('saleUnit.title', 'title')
      .andWhere('saleOrder.settleAmount < (saleOrder.totalAmount)')
      .groupBy('saleUnit.id')
      .addGroupBy('saleUnit.title')
      .addGroupBy('q.type')
      .getRawMany();
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
      params?.start ? params?.start : moment(),
      AppConstant.SUBMIT_TIME_FORMAT
    );
    if (startMoment.isValid()) {
      where['submitAt'] = MoreThanOrEqual(startMoment.toDate());
    }

    if (params.end) {
      let endMoment = moment(params.end, AppConstant.SUBMIT_TIME_FORMAT);
      if (endMoment.isValid()) {
        where['submitAt'] = LessThanOrEqual(endMoment.toDate());
      }
    }
    if (params.operator) {
      where['createdBy'] = { id: +params.operator };
    }
    if (params.user) {
      where['user'] = { id: +params.user };
    }

    if (params['saleUnit.in'] && current.isAdmin()) {
      where['saleUnit'] = {
        id: In(params['saleUnit.in']?.split(',').map((e) => +e))
      };
    } else if (!current.isAdmin()) {
      console.log('called', params['saleUnit.in']);
      if (params['saleUnit.in']) {
        let saleUnitIds = params['saleUnit.in']
          ?.split(',')
          .filter((e) => current.accessShops.find((el) => +el.id === +e));

        if (saleUnitIds < 1) {
          throw new BadRequestException('access deniad');
        } else {
          where['saleUnit'] = {
            id: In(saleUnitIds)
          };
        }
      } else {
        where['saleUnit'] = {
          id: In(current.accessShops?.map((e) => e.id) || [])
        };
      }
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
      let startMoment = moment(params.start, AppConstant.SUBMIT_TIME_FORMAT);
      let endMoment = moment(params.end, AppConstant.SUBMIT_TIME_FORMAT);
      if (endMoment.isValid() && startMoment.isValid()) {
        where['submitAt'] = Between(startMoment.toDate(), endMoment.toDate());
      }
    }
    console.log('where turnover', where['saleUnit'], params);
    return where;
  }

  async tags(params: any, where: any) {
    if (params.shiftWork) {
      delete where.shiftWork;
    }
    const query = SaleItem.createQueryBuilder('q')
      .leftJoinAndSelect('q.product', 'p')
      .leftJoin('p.reportTag', 'reportTag')
      .leftJoin('q.saleOrder', 'saleOrder')
      .leftJoin('q.registeredService', 'registeredService')
      .select([])
      .addSelect('count(q.id)', 'count')
      .addSelect('SUM(q.discount)', 'discount')
      .addSelect('SUM(q.quantity)', 'quantity')
      .addSelect('reportTag.name', 'title')
      .addSelect('reportTag.id', 'Tagid')

      .addSelect('SUM(q.amount * q.quantity)', 'amount')
      .where(where)
      .andWhere('q.registeredService is null')
      .andWhere('p.reportTag is not null')
      .andWhere('q.saleOrder is not null')
      .andWhere('q.canceledDate is null');

    if (params.type) {
      query.andWhere('q.type=:type', { type: params.type });
    }

    if (params.shiftWork) {
      query.andWhere('saleOrder.shiftWork=:shiftWork', {
        shiftWork: +params.shiftWork
      });
    }

    return await query
      .groupBy('reportTag.name')
      .addGroupBy('reportTag.id')
      .getRawMany();
  }

  async saleItems(params: any, where: any) {
    if (params.shiftWork) {
      delete where.shiftWork;
    }
    const query = SaleItem.createQueryBuilder('q')
      .leftJoin('q.product', 'p')
      .leftJoin('q.saleOrder', 'saleOrder')
      .leftJoin('q.registeredService', 'registeredService')
      .select([])
      .addSelect('count(q.id)', 'count')
      .addSelect('SUM(q.discount)', 'discount')
      .addSelect('SUM(q.tax)', 'tax')
      .addSelect('SUM(q.quantity)', 'quantity')
      .addSelect('p.title', 'title')
      .addSelect('p.id', 'productId')
      .addSelect('SUM(q.amount * q.quantity)', 'amount')
      .addSelect('SUM((q.amount * q.quantity) * (q.tax/100))', 'taxAmount')
      .addSelect(
        'SUM(q.amount * q.quantity) + SUM(((q.amount * q.quantity) - q.discount - q.return_credit) * q.tax / 100) - SUM(q.discount)',
        'totalAmount'
      )
      .where(where)
      .andWhere('q.registeredService is null')
      .andWhere('q.parent is null')
      .andWhere('q.saleOrder is not null')
      .andWhere('q.canceledDate is null');

    if (params.type) {
      query.andWhere('q.type=:type', { type: params.type });
    }

    if (params.shiftWork) {
      query.andWhere('saleOrder.shiftWork=:shiftWork', {
        shiftWork: +params.shiftWork
      });
    }

    return await query.addGroupBy('p.id').addGroupBy('p.title').getRawMany();
  }

  async discount(params: any, where: any) {
    if (params.shiftWork) {
      delete where.shiftWork;
    }
    const query = SaleItem.createQueryBuilder('q')
      .leftJoin('q.product', 'p')
      .leftJoin('q.saleOrder', 'saleOrder')
      .leftJoin('q.registeredService', 'registeredService')
      .select([])
      .addSelect('count(q.id)', 'count')
      .addSelect('SUM(q.discount)', 'discount')
      .addSelect('SUM(q.tax)', 'tax')
      .addSelect('SUM(q.quantity)', 'quantity')
      .addSelect('p.title', 'title')
      .addSelect('p.id', 'productId')
      .addSelect('SUM(q.amount * q.quantity)', 'amount')
      .addSelect('SUM((q.amount * q.quantity) * (q.tax/100))', 'taxAmount')
      .addSelect(
        'SUM(q.amount * q.quantity) + SUM(((q.amount * q.quantity) - q.discount - q.return_credit) * q.tax / 100) - SUM(q.discount)',
        'totalAmount'
      )
      .where(where)
      .andWhere('q.registeredService is null')
      .andWhere('q.parent is null')
      .andWhere('q.saleOrder is not null')
      .andWhere('q.canceledDate is null');

    if (params.type) {
      query.andWhere('q.type=:type', { type: params.type });
    }

    if (params.shiftWork) {
      query.andWhere('saleOrder.shiftWork=:shiftWork', {
        shiftWork: +params.shiftWork
      });
    }

    return await query
      .andWhere('q.discount > 0')
      .addGroupBy('p.id')
      .addGroupBy('p.title')
      .getRawMany();
  }

  async transferSaleItems(params: any, where: any) {
    if (params.shiftWork) {
      delete where.shiftWork;
    }
    const query = SaleItem.createQueryBuilder('q')
      .leftJoin('q.product', 'p')
      .leftJoin('q.saleOrder', 'saleOrder')
      .leftJoin('q.registeredService', 'registeredService')
      .select([])
      .addSelect('count(q.id)', 'count')
      .addSelect('SUM(q.discount)', 'discount')
      .addSelect('SUM(q.tax)', 'tax')
      .addSelect('SUM(q.quantity)', 'quantity')
      .addSelect('p.title', 'title')
      .addSelect('p.id', 'productId')
      .addSelect('SUM(q.amount * q.quantity)', 'amount')
      .addSelect('SUM((q.amount * q.quantity) * (q.tax/100))', 'taxAmount')
      .addSelect(
        'SUM(q.amount * q.quantity) + SUM(((q.amount * q.quantity) - q.discount - q.return_credit) * q.tax / 100) - SUM(q.discount)',
        'totalAmount'
      )
      .where(where)
      .andWhere('q.registeredService is null')
      .andWhere('q.parent is null')
      .andWhere('q.saleOrder is not null')
      .andWhere('q.canceledDate is null');

    if (params.type) {
      query.andWhere('q.type=:type', { type: params.type });
    }

    if (params.shiftWork) {
      query.andWhere('saleOrder.shiftWork=:shiftWork', {
        shiftWork: +params.shiftWork
      });
    }

    return await query
      .clone()
      .andWhere('q.is_transfer=true')
      .addGroupBy('p.id')
      .addGroupBy('p.title')
      .getRawMany();
  }

  async taxs(params: any, where: any) {
    if (params.shiftWork) {
      delete where.shiftWork;
    }
    const query = SaleItem.createQueryBuilder('q')
      .leftJoin('q.saleOrder', 'saleOrder')
      .leftJoin('q.registeredService', 'registeredService')
      .select([])
      .addSelect('count(q.id)', 'count')
      .addSelect('SUM(q.discount)', 'discount')
      .addSelect('SUM(q.tax)', 'tax')
      .addSelect('SUM(q.quantity)', 'quantity')
      .addSelect(
        'SUM(((q.amount * q.quantity) -((q.discount) + (q.returnCredit))) * (q.tax/100))',
        'amount'
      )
      .where(where)
      .andWhere('q.registeredService is null')
      .andWhere('q.parent is null')
      .andWhere('q.tax > 0')
      .andWhere('q.saleOrder is not null')
      .andWhere('q.canceledDate is null');

    if (params.type) {
      query.andWhere('q.type=:type', { type: params.type });
    }

    if (params.shiftWork) {
      query.andWhere('saleOrder.shiftWork=:shiftWork', {
        shiftWork: +params.shiftWork
      });
    }

    return await query.getRawOne();
  }
}
