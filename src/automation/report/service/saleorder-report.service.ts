import { BadRequestException, Injectable } from '@nestjs/common';
import { UserLoan } from 'src/automation/operational/entities/UserLoan';
import moment from 'moment';
import { ProductAlarmType } from 'src/automation/base/entities/Product';
import { SaleItem } from '../../../automation/operational/entities/SaleItem';
import { SaleOrder } from 'src/automation/operational/entities/SaleOrder';
import { SaleUnit } from 'src/base/entities/SaleUnit';
import { User } from 'src/base/entities/User';
import { AppConstant } from '../../../common/constant/app.constant';
import {
  RELATIONS_KEY,
  addAuditFilterToQuery,
  createSortQuery
} from '../../../common/decorators/mvc.decorator';
import { In, LessThan, MoreThanOrEqual } from 'typeorm';

@Injectable()
export class SaleOrderReportService {
  async orderLoanReport(
    params: any,
    current: User
  ): Promise<[SaleOrder[], number]> {
    // console.log(await SaleOrder.createQueryBuilder('q').getManyAndCount())

    let relationOptions: any = Reflect.getMetadata(RELATIONS_KEY, SaleOrder);
    relationOptions = relationOptions || {};
    const queryWhere: any = {};
    const subQueryWhere: any = {};
    if (params.organizationUnit) {
      queryWhere['organizationUnit'] = { id: +params.organizationUnit };
    } else if (!current.isAdmin()) {
      if (current.isContractor() && params.contractor && !current.isUser()) {
      } else {
        queryWhere['organizationUnit'] = {
          id: In(current.accessOrganizationUnits?.map((s) => s.id))
        };
      }
    }

    if (params.fiscalYear) {
      queryWhere['fiscalYear'] = { id: +params.fiscalYear };
    } else if (!current.isAdmin()) {
      if (current.isContractor() && params.contractor && !current.isUser()) {
      } else {
        queryWhere['fiscalYear'] = {
          id: In(current.accessFiscalYears?.map((s) => s.id))
        };
      }
    }
    if (params['user'] || params['user.equals']) {
      queryWhere['user'] = { id: +params.user | params['user.equals'] };
    }

    // isBurn.equals: true
    if (typeof params['isBurn.equals'] !== typeof undefined) {
      queryWhere['isBurn'] = params['isBurn.equals'];
    }

    if (params['transferType']) {
      queryWhere['transferType'] = { id: +params['transferType'] };
    }

    if (params['saleStatus.equals'] || params['saleStatus.equals'] === 0) {
      queryWhere['saleStatus'] = params['saleStatus.equals'];
    }

    if (params['id.equals']) {
      queryWhere['id'] = params['id.equals'];
    }

    console.log(params['reception']);

    let reception;

    if (params['reception'] || params['reception.equals']) {
      if (params['reception']) {
        reception =
          params['reception'] != undefined ? !!+params['reception'] : undefined;
      }
      if (params['reception.equals']) {
        reception =
          params['reception.equals'] != undefined
            ? params['reception.equals'] === 'true'
              ? true
              : false
            : undefined;
      }
    }

    if (params.saleUnit) {
      if (
        !(
          current.isAdmin() ||
          current.accessShops?.some((s) => s.id == +params.saleUnit)
        )
      ) {
        throw new BadRequestException('Access denied');
      }
    }
    if (reception) {
      if (params.saleUnit) {
        queryWhere['saleUnit'] = { id: params.saleUnit };
      } else {
        if (!current.isAdmin()) {
          if (
            current.isContractor() &&
            params.contractor &&
            !current.isUser()
          ) {
          } else {
            queryWhere['saleUnit'] = {
              id: In(current.accessShops?.map((s) => s.id))
            };
          }
        }
      }
    } else {
      let saleUnits;
      if (params.saleUnit) {
        saleUnits = (
          await SaleUnit.createQueryBuilder('s')
            .select(['id'])
            .where([
              { id: params.saleUnit },
              { reception: params.saleUnit, allowSettle: false }
            ])
            .cache(true)
            .getRawMany()
        ).map((a) => a.id);
      }
      if (params.saleUnit) {
        subQueryWhere['saleUnit'] = { id: In(saleUnits) };
      } else if (!current.isAdmin()) {
        if (current.isContractor() && params.contractor && !current.isUser()) {
        } else {
          subQueryWhere['saleUnit'] = {
            id: In(current.accessShops?.map((s) => s.id))
          };
        }
      }
    }

    if (reception != undefined) {
      queryWhere['reception'] = reception;
    }
    if (params.type) {
      subQueryWhere['type'] = params['type'];
    }
    if (params.saleType) {
      subQueryWhere['saleType'] = params['saleType'];
    }

    const globalWhere = [];
    if (params['global.contains']) {
      globalWhere.push(`items.meta LIKE '%${params['global.contains']}%'`);
      globalWhere.push(`user.first_name LIKE '%${params['global.contains']}%'`);
      globalWhere.push(`user.last_name LIKE '%${params['global.contains']}%'`);
      if (Number(params['global.contains'])) {
        if (
          params['global.contains'].length >= 10 &&
          (params['global.contains'].startsWith('9') ||
            params['global.contains'].startsWith('09'))
        ) {
          globalWhere.push(`user.mobile LIKE '%${params['global.contains']}'`);
        }
        if (!params['global.contains'].startsWith('09')) {
          globalWhere.push(`q.id =  ${params['global.contains']}`);
          globalWhere.push(`user.code =  ${params['global.contains']}`);
        }
      }
    }

    const query = SaleOrder.createQueryBuilder('q')
      .leftJoinAndSelect('q.user', 'user')
      .leftJoinAndSelect('q.saleUnit', 'saleUnit')
      .leftJoinAndSelect('q.organizationUnit', 'organizationUnit')
      .leftJoinAndSelect('q.productCategory', 'productCategory')
      .leftJoinAndSelect('q.transferType', 'transferType')
      .leftJoinAndSelect('q.userLoan', 'userLoan')
      .leftJoinAndSelect('userLoan.items','userLoanitems')
      .leftJoinAndSelect('userLoanitems.transactions','userLoanitemsTrx')
      .leftJoinAndSelect('q.receptionSaleOrder','receptionSaleOrder')
      .leftJoinAndSelect('q.createdBy','createdBy')
      .leftJoinAndSelect('q.updatedBy','updatedBy')

      .leftJoinAndSelect('userLoan.loan', 'loan')
      .leftJoinAndSelect('q.transactions', 'transactions');

      query
        .leftJoinAndSelect('q.items', '_items')
        .leftJoinAndSelect('_items.product', '_product')
        .leftJoinAndSelect('_items.registeredService', 'registeredService');

    query
      .addSelect('items.tax', 'q_tax')
      .addSelect('items.discount', 'q_discount')
      .addSelect(
        'items.total_amount + items.tax - items.discount',
        'q_total_amount'
      )
      .addSelect('items.quantity', 'q_quantity')
      .addSelect('items.meta', 'q_meta');
    query.innerJoin(
      (qb) => {
        return qb
          .from(SaleItem, 'si')
          .leftJoinAndSelect('si.contractor', 'contractor')
          .select([])
          .addSelect('si.sale_order', 'sale_order')
          .addSelect(
            'SUM(((si.amount * si.quantity) - si.discount - si.return_credit) * si.tax / 100)',
            'tax'
          )
          .addSelect('SUM(si.discount)', 'discount')
          .addSelect('SUM(si.amount * si.quantity)', 'total_amount')
          .addSelect('SUM(si.quantity)', 'quantity')
          .addSelect("string_agg(si.title, ', ')", 'meta')
          .where(subQueryWhere)
          .andWhere('si.parent IS NULL')
          .groupBy('si.sale_order');
      },
      'items',
      'items.sale_order=q.id'
    );

    if (params['audit']) {
      query.leftJoinAndSelect('q.createdBy', 'c');
      query.leftJoinAndSelect('q.updatedBy', 'u');
    }

    query
      .where(queryWhere)
      .andWhere(globalWhere.length ? globalWhere?.join(' OR ') : '1=1');

    if (params.hasLoan === 'true') {
      query.andWhere('userLoan.order is not null');
    } else if (params.hasLoan === 'false') {
      query.andWhere('userLoan.order is null');
    }

    if (
      params['isPayed.equals'] === 'true' ||
      params['isPayed.equals'] === true
    ) {
      query.andWhere('userLoan.is_payed=true');
    } else if (
      params['isPayed.equals'] === 'false' ||
      params['isPayed.equals'] === false
    ) {
      query.andWhere('userLoan.is_payed=false');
    }

    if (params['loan.equals']) {
      query.andWhere('userLoan.loan=:loanValue', {
        loanValue: params['loan.equals']
      });
    }

    if (params['dept.equals'] != undefined) {
      if (params['dept.equals'] === 'true') {
        query.andWhere(
          `q.settle_amount < (q.total_amount + q.tax - q.discount)`
        );
      } else {
        query.andWhere(
          `q.settle_amount = (q.total_amount + q.tax - q.discount)`
        );
      }
    }


    if (params['start']) {
      query.andWhere({
        submitAt: MoreThanOrEqual(
          moment(
            `${params['start']} 00:00`,
            AppConstant.SUBMIT_TIME_FORMAT
          ).toDate()
        )
      });
    }
    if (params['end']) {
      query.andWhere({
        submitAt: LessThan(
          moment(`${params['end']} 00:00`, AppConstant.SUBMIT_TIME_FORMAT)
            .add(1, 'day')
            .toDate()
        )
      });
    }


    if (params.product) {
      query
        .leftJoinAndSelect('q.items', '_items')
        .leftJoinAndSelect('_items.product', '_product')
        .andWhere('_product.id=:product', { product: params.product });
    }

    if (params['usergroups.contains']) {
      query.andWhere('groups.id=:x', { x: params['usergroups.contains'] });
    }

    if (params['items.contains']) {
      query.andWhere('_product.id=:product', {
        product: params['items.contains']
      });
    }

    // query.addSelect('q.saleOrderReceptionId','saleOrderReceptionId')

    addAuditFilterToQuery(params, query);

    const sortMetaData = createSortQuery(SaleOrder, params, relationOptions);
    for (const s of sortMetaData) {
      query.addOrderBy(`${s.entity ? s.entity : 'q'}.${s.property}`, s.dir);
    }

      const data = await query
        .skip(params.offset || 0)
        .take(params.limit || 10)
        .getManyAndCount();
      if (data?.[0]) {
        data[0] = data[0]?.map((d) => ({
          ...d,
          items: d?.items?.map((i) => ({
            ...i,
            product: {
              ...i.product,
              alarms: i?.product?.alarms?.map((a) => ({
                ...a,
                compareKey:
                  a?.type === ProductAlarmType.remainCreditAlarm
                    ? 'credit'
                    : 'end'
              }))
            }
          }))
        })) as any;
      }
      return data;

  
  }
}
