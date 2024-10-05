import { Injectable } from '@nestjs/common';
import moment from 'moment';
import { OfferedDiscount } from '../entities/OfferedDiscount';
import { UserGroup } from '../../base/entities/UserGroup';
import { SaleItem } from '../../automation/operational/entities/SaleItem';
import {
  Transaction,
  TransactionType
} from '../../automation/operational/entities/Transaction';
import { Product } from '../../automation/base/entities/Product';
import { AppConstant } from '../../common/constant/app.constant';
import { DiscountItem } from '../entities/DiscountItem';
import { DataSource, EntityManager } from 'typeorm';
import { TransactionSourceType } from '../../base/entities/TransactionSource';

@Injectable()
export class DiscountService {
  constructor(private ds: DataSource) {}

  async findBy(
    code: string,
    user: number,
    organizationUnit: number,
    saleUnits: string,
    products: string,
    submitAt?: Date,
    transactions?: string,
    saleItems?: string
  ) {
    let result = await OfferedDiscount.createQueryBuilder('q')
      .leftJoinAndSelect('q.items', 'items')
      .where(
        `(q.user = ${user} OR (q.group IS NULL OR q.group IN (${UserGroup.createQueryBuilder(
          'u'
        )
          .select(['u.group'])
          .where(`u.user = ${user}`)
          .getQuery()})))`
      )
      .andWhere(
        `(q.start <= '${moment(submitAt)
          .utc(true)
          .format(AppConstant.DATE_FORMAT)}'
               AND q.expired_time >= '${moment(submitAt)
                 .utc(true)
                 .format(AppConstant.DATE_FORMAT)}')`
      )
      .andWhere(
        `(items.org_unit IS NULL OR items.org_unit = ${organizationUnit})`
      )
      .andWhere(
        `(items.sale_unit IS NULL OR items.sale_unit IN (${saleUnits}))`
      )
      .andWhere(
        `(items.category IS NULL OR items.category IN (${Product.createQueryBuilder(
          'p'
        )
          .select(['p.category'])
          .where(`p.id IN (${products})`)
          .getQuery()}))`
      )
      .andWhere(`(items.product IS NULL OR items.product IN (${products}))`)
      .andWhere(
        `(items.first IS FALSE OR NOT EXISTS(${SaleItem.createQueryBuilder('si')
          .select(['si.id'])
          .where(
            `si.user = ${user} 
                         AND (items.product IS NULL OR si.product=items.product)
                         AND (items.category IS NULL OR si.category=items.category) 
                         AND (items.sale_unit IS NULL OR si.sale_unit=items.sale_unit)
                         AND (items.org_unit IS NULL OR si.org_unit=items.org_unit)`
          )
          .andWhere(`si.id NOT IN (${saleItems || '-1'})`)
          .getQuery()}))`
      )
      .getMany();
    let out = [];
    if (result?.length) {
      let used = await OfferedDiscount.createQueryBuilder('t')
        .select('t.id as id')
        .addSelect('count(trx.id)', 'cnt')
        .innerJoin(
          Transaction,
          'trx',
          'trx.source = t.id AND trx.type = :type AND trx.sourceType = :sourceType',
          {
            type: TransactionType.Settle,
            sourceType: TransactionSourceType.OfferedDiscount
          }
        )
        .where(`t.id IN (${result?.map((d) => d.id)?.join(',')})`)
        .andWhere(`trx.id NOT IN (${transactions || '-1'})`)
        .groupBy('t.id')
        .getRawMany();
      for (let discount of result) {
        let find = used.find((u) => u.id == discount.id);
        if (find) {
          if (discount.quantity > find.cnt) {
            discount.used = find.cnt;
            out.push(discount);
          }
        } else {
          discount.used = 0;
          out.push(discount);
        }
      }
    }
    return out;
  }

  async getDiscountAmount(
    id: number,
    code: string,
    user: number,
    organizationUnit: number,
    saleUnit: number,
    submitAt?: Date,
    transaction?: number,
    saleItems?: SaleItem[],
    manager?: EntityManager
  ): Promise<[OfferedDiscount, number, string]> {
    let products = saleItems
      ?.map((s) => s.productId || s.product?.id)
      .join(',');
    let saleUnitIds = [
      ...new Set([
        ...saleItems?.map((s) => s.saleUnit?.id || s.saleUnitId),
        saleUnit
      ])
    ].join(',');
    let result = await OfferedDiscount.createQueryBuilder('q')
      .leftJoinAndSelect('q.items', 'items')
      .where({ id: id })
      .andWhere(
        `(q.user = ${user} OR (q.code ${
          code ? " = '" + code + "'" : 'IS NOT NULL'
        } AND (q.group IS NULL OR q.group IN (${UserGroup.createQueryBuilder(
          'u'
        )
          .select(['u.group'])
          .where(`u.user = ${user}`)
          .getQuery()}))))`
      )
      .andWhere(
        `(q.start <= '${moment(submitAt)
          .utc(true)
          .format(AppConstant.DATE_FORMAT)}'
               AND q.expired_time >= '${moment(submitAt)
                 .utc(true)
                 .format(AppConstant.DATE_FORMAT)}')`
      )
      .andWhere(
        `(items.org_unit IS NULL OR items.org_unit = ${organizationUnit})`
      )
      .andWhere(
        `(items.sale_unit IS NULL OR items.sale_unit IN (${saleUnitIds}))`
      )
      .andWhere(
        `(items.category IS NULL OR items.category IN (${Product.createQueryBuilder(
          'p'
        )
          .select(['p.category'])
          .where(`p.id IN (${products})`)
          .getQuery()}))`
      )
      .andWhere(`(items.product IS NULL OR items.product IN (${products}))`)
      .andWhere(
        `(items.first IS FALSE OR NOT EXISTS(${SaleItem.createQueryBuilder('si')
          .select(['si.id'])
          .where(
            `si.user = ${user} 
                         AND (items.product IS NULL OR si.product=items.product)
                         AND (items.category IS NULL OR si.category=items.category) 
                         AND (items.sale_unit IS NULL OR si.sale_unit=items.sale_unit)
                         AND (items.org_unit IS NULL OR si.org_unit=items.org_unit)`
          )
          .andWhere(`si.id NOT IN (${saleUnitIds || '-1'})`)
          .getQuery()}))`
      )
      .getOne();
    if (result) {
      let used = await OfferedDiscount.createQueryBuilder('t')
        .select('t.id as id')
        .addSelect('count(trx.id)', 'cnt')
        .innerJoin(
          Transaction,
          'trx',
          'trx.source = t.id AND trx.type = :type AND trx.sourceType = :sourceType',
          {
            type: TransactionType.Settle,
            sourceType: TransactionSourceType.OfferedDiscount
          }
        )
        .where(`t.id = ${result?.id}`)
        .andWhere(`trx.id <> ${transaction || '-1'}`)
        .groupBy('t.id')
        .getRawOne();

      if ((used?.cnt || 0) < result.quantity) {
        let total = 0;
        let amount = 0;
        let description = '';
        let items = [];
        if (result.items?.length) {
          for (let item of saleItems || []) {
            if ((item.totalAmount || 0) > 0) {
              let find = result.items?.find(
                (p: DiscountItem) =>
                  (!p.saleUnitId ||
                    p.saleUnitId == (item.saleUnit || item.saleUnitId) ||
                    p.saleUnitId == saleUnit) &&
                  (!p.categoryId ||
                    p.categoryId == item.product?.categoryId ||
                    p.categoryId == item?.categoryId) &&
                  (!p.productId ||
                    p.productId == item.product?.id ||
                    p.productId == item?.productId)
              );
              if (find) {
                total += item.totalAmount || 0;
                items.push(item.title);
              }
            }
          }
          description = items?.join(', ');
        } else {
          total = saleItems
            ?.map((s) => s.totalAmount)
            .reduce((a, b) => a + b, 0);
        }
        if (total > 0) {
          amount = result.isPercent
            ? (total * (result.amount || 0)) / 100
            : result.amount || 0;
          if (result.isPercent && amount > (result.maxValue || amount)) {
            amount = result.maxValue || amount;
          }
        }
        if (amount > 0) {
          return [result, amount, description];
        }
      }
    }
    return null;
  }
}
