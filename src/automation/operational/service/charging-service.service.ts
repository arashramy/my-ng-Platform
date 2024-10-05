import { Injectable } from '@nestjs/common';
import { SaleItem } from '../entities/SaleItem';
import { AppConstant } from '../../../common/constant/app.constant';
import moment from 'moment';
import { Product } from '../../base/entities/Product';
import { DataSource, EntityManager } from 'typeorm';
import { SubProduct } from '../../base/entities/SubProduct';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';


@Injectable()
export class ChargingServiceProvider {
  constructor(private ds: DataSource) {}

  async findBy(
    user: number,
    organizationUnit: number,
    saleUnits: string,
    products: string,
    submitAt?: Date,
    saleItems?: string,
    ids?: string,
    chargingServiceId?: number,
    transferableToWallet?: any
  ) {
    console.log(':::', transferableToWallet);
    let current = submitAt ? moment(submitAt) : moment();
    let day = current.isoWeekday();
    let query = SaleItem.createQueryBuilder('q')
      .leftJoin('q.saleOrder', 'saleOrder')
      .leftJoinAndSelect('q.product', 'product')
      .leftJoin('product.schedules', 'schedules')
      .leftJoinAndSelect('product.subProducts', 'subProducts')
      .leftJoinAndSelect('subProducts.organizationUnit', 'organizationUnit')
      .leftJoinAndSelect('product.tagProductParent', 'tagProductParent')
      .leftJoinAndSelect('product.tagProducts', 'tagProducts')
      .leftJoinAndSelect('q.user', 'user')
      .where(
        `(${
          user === 0
            ? ''
            : `
            (
              (q.is_online = TRUE AND q.consumer = ${user} AND q.consumer IS NOT NULL) 
              OR 
              (
                (q.is_online = FALSE AND q.user = ${user} AND q.consumer IS NULL) 
                OR 
                (q.is_online = FALSE AND q.consumer = ${user} AND q.consumer IS NOT NULL)
              )
            ) AND `
        } saleOrder.total_amount = saleOrder.settle_amount AND q.id NOT IN (${
          saleItems || '-1'
        })) ${
          typeof transferableToWallet === typeof undefined
            ? ''
            : ` AND product.transferable_to_wallet = ${
                transferableToWallet === 'true'
              }`
        }`
      )
      .andWhere(
        `(q.type = ${SaleUnitType.Credit}
               AND q.start <= '${moment(submitAt)
                 .utc(true)
                 .format(AppConstant.DATE_FORMAT)}'
               AND q.end >= '${moment(submitAt)
                 .utc(true)
                 .format(AppConstant.DATE_FORMAT)}' 
               AND ((q.credit > q.used_credit AND q.status = 0) OR q.id in (${
                 ids || '-1'
               })))`
      )
      .andWhere(
        `(schedules.id IS NULL OR (schedules.days::jsonb @> '${day}' AND 
            schedules.from_time <= :time AND schedules.to_time > :time))`,
        {
          time: current.utc(true).format('HH:mm:ss')
        }
      )
      .andWhere(
        `(subProducts.org_unit IS NULL OR subProducts.org_unit = ${
          organizationUnit || 'NULL'
        })`
      )
      if(!transferableToWallet){
          query.andWhere(
            `(subProducts.sale_unit IS NULL OR subProducts.sale_unit IN (${
              saleUnits || 'NULL'
            }))`
          );
      }

    if (products) {
      query
        .andWhere(
          `(subProducts.category IS NULL OR subProducts.category IN (${Product.createQueryBuilder(
            'p'
          )
            .select(['p.category'])
            .where(`p.id IN (${products})`)
            .getQuery()}))`
        )
        .andWhere(
          `(subProducts.product IS NULL OR subProducts.product IN (${products}))`
        );
    }

    if (chargingServiceId) {
      query.andWhere(`q.id = ${chargingServiceId}`);
    }
    return query.getMany();
  }

  async getCharging(
    id: number,
    user: number,
    organizationUnit: number,
    saleUnit: number,
    submitAt?: Date,
    transaction?: number,
    saleItems?: SaleItem[],
    manager?: EntityManager,
    fromGuest: boolean = false
  ): Promise<[SaleItem, number, string]> {
    manager ||= this.ds.manager;
    let current = submitAt ? moment(submitAt) : moment();
    let day = current.isoWeekday();
    let result = await manager
      .createQueryBuilder()
      .from(SaleItem, 'q')
      .select(['q'])
      .leftJoin('q.saleOrder', 'saleOrder')
      .leftJoinAndSelect('q.product', 'product')
      .leftJoin('product.schedules', 'schedules')
      .leftJoinAndSelect('product.subProducts', 'subProducts')
      .where({ id: id })
      .andWhere(
        `(${
          fromGuest
            ? ''
            : `((q.user = ${user} AND q.consumer IS NULL) OR q.consumer = ${user}) AND `
        } saleOrder.total_amount = saleOrder.settle_amount)`
      )
      .andWhere(
        `(q.type = ${SaleUnitType.Credit}
               AND q.status = 0
               AND q.start <= '${moment(submitAt)
                 .utc(true)
                 .format(AppConstant.DATE_FORMAT)}'
               AND q.end >= '${moment(submitAt)
                 .utc(true)
                 .format(AppConstant.DATE_FORMAT)}' )`
      )
      .andWhere(
        `(schedules.id IS NULL OR (schedules.days::jsonb @> '${day}' AND 
                                        schedules.from_time <= :time AND schedules.to_time > :time))`,
        {
          time: current.utc(true).format('HH:mm:ss')
        }
      )
      .getOne();
    if (result) {
      let remainCredit = (+result.credit || 0) - (+result.usedCredit || 0);
      let total = 0;
      let description = '';
      let items = [];
      if (result.product?.subProducts?.length && !result.product.transferableToWallet) {
        for (let item of saleItems || []) {
          if ((item.totalAmount || 0) > 0) {
            let find = result.product?.subProducts?.find(
              (p: SubProduct) =>
                (!p.saleUnitId ||
                  p.saleUnitId == (item.saleUnit || item.saleUnitId) ||
                  p.saleUnitId == saleUnit) &&
                (!p.categoryId ||
                  p.categoryId ==
                    (item.product?.categoryId || item.categoryId)) &&
                (!p.productId ||
                  p.productId == (item.product?.id || item.productId))
            );

            if (find) {
              items.push(item);
              total += item.totalAmount || 0;
            }
          }
        }
        description = items?.map((si) => si.title).join(', ');
        return [
          result,
          remainCredit > total ? total : +remainCredit,
          description
        ];
      } else {
        return [result, remainCredit, ''];
      }
    }
    return [null, 0, ''];
  }

  async getChargingForArchived(
    id: number,
    amount?: number,
    manager?: EntityManager
  ): Promise<[SaleItem, number, string]> {
    manager ||= this.ds.manager;
    let result = await manager
      .createQueryBuilder()
      .from(SaleItem, 'q')
      .select(['q'])
      .leftJoin('q.saleOrder', 'saleOrder')
      .leftJoinAndSelect('q.product', 'product')
      .leftJoin('product.schedules', 'schedules')
      .leftJoinAndSelect('product.subProducts', 'subProducts')
      .where({ id: id })
      .andWhere(`(saleOrder.total_amount = saleOrder.settle_amount)`)
      .getOne();
    if (result) {
      return [result, amount, null];
    }
    return [null, 0, ''];
  }
}
