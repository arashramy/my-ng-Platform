import { BadRequestException, Injectable } from '@nestjs/common';
import { RegisteredServiceStatus, SaleItem } from '../entities/SaleItem';
import { ProductItemService } from './product-item.service';
import { RegisteredProductProvider } from './registered-product-provider';
import { ServiceItemService } from './service-item.service';
import {
  Between,
  EntityManager,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not
} from 'typeorm';
import { User } from '../../../base/entities/User';
import { SaleItemDto } from '../dto/sale-order.dto';
import { SaleUnit,  } from '../../../base/entities/SaleUnit';
import { CreditProductProvider } from './credit-product-provider';
import { Product } from '../../base/entities/Product';
import { AppConstant } from '../../../common/constant/app.constant';
import moment from 'moment';
import { SaleOrder } from '../entities/SaleOrder';
import {
  addAuditFilterToQuery,
  createSortQuery,
  RELATIONS_KEY
} from '../../../common/decorators/mvc.decorator';
import { PackageItemService } from './package-item.service';
import { isEmpty } from 'class-validator';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';


@Injectable()
export class SaleItemService {
  constructor(
    private productItemService: ProductItemService,
    private serviceItemService: ServiceItemService,
    private creditProductProvider: CreditProductProvider,
    private packageItemService: PackageItemService,
    private registeredProductProvider: RegisteredProductProvider
  ) {}

  async findAll(params: any, current: User): Promise<[SaleItem[], number]> {
    let relationOptions: any = Reflect.getMetadata(RELATIONS_KEY, SaleItem);
    relationOptions = relationOptions || {};
    let queryWhere: any = {};

    if (params.organizationUnit) {
      queryWhere['organizationUnit'] = { id: params.organizationUnit };
    } else if (!current?.isAdmin()) {
      if (current.isContractor() && params.contractor && !current.isUser()) {
      } else {
        queryWhere['organizationUnit'] = {
          id: In(current.accessOrganizationUnits?.map((s) => s.id))
        };
      }
    }

    if (params.fiscalYear) {
      queryWhere['fiscalYear'] = { id: params.fiscalYear };
    } else if (!current?.isAdmin()) {
      if (current.isContractor() && params.contractor && !current.isUser()) {
      } else {
        queryWhere['fiscalYear'] = {
          id: In(current.accessFiscalYears?.map((s) => s.id))
        };
      }
    }

    if (params.id) {
      queryWhere['id'] = params.id;
    }

    if (params.ids) {
      queryWhere['id'] = In(params.ids.split(','));
    }
    let saleUnits;

    if (params.saleUnit) {
      if (
        !(
          current?.isAdmin() ||
          current.accessShops?.some((s) => s.id == +params.saleUnit)
        )
      ) {
        throw new BadRequestException('Access denied');
      }

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
      queryWhere['saleUnit'] = { id: In(saleUnits) };
    } else if (!current?.isAdmin()) {
      if (current.isContractor() && params.contractor && !current.isUser()) {
      } else {
        queryWhere['saleUnit'] = {
          id: In(current.accessShops?.map((s) => s.id))
        };
      }
    }

    if (params['saleUnit.in']) {
      let saleUnitIds = [
        ...params['saleUnit.in'].split(',').map((e: any) => +e)
      ];

      let saleUnitsResult;
      console.log(
        'saleunittttsss',
        saleUnitIds,
        current.accessShops.map((e) => e.id),
        saleUnitIds.filter((e) => current.accessShops.find((el) => el.id === e))
      );

      if (!current.isUser()) {
        // console.log('called');
        saleUnitIds = saleUnitIds.filter((e) =>
          current.accessShops.find((el) => el.id === e)
        );
        // throw new BadRequestException('Access denied');
      }

      saleUnitsResult = (
        await SaleUnit.createQueryBuilder('s')
          .select(['id'])
          .where([{ id: In(saleUnitIds) }])
          .cache(true)
          .getRawMany()
      ).map((a) => a.id);

      queryWhere['saleUnit'] = { id: In(saleUnitsResult) };
    } else if (!current?.isAdmin()) {
      if (current.isContractor() && params.contractor && !current.isUser()) {
      } else {
        queryWhere['saleUnit'] = {
          id: In(current.accessShops?.map((s) => s.id))
        };
      }
    }

    if (params['credit.gte']) {
      queryWhere['credit'] = MoreThanOrEqual(params['credit.gte']);
    }

    if (params['credit.lte']) {
      queryWhere['credit'] = LessThanOrEqual(params['credit.lte']);
    }

    if (params['credit.lte'] && params['credit.gte']) {
      queryWhere['credit'] = Between(
        +params['credit.gte'],
        +params['credit.lte']
      );
    }

    if (params['discount.gt'] !== undefined) {
      queryWhere['discount'] = Not(0);
    }

    if (params['discount.gte'] !== undefined) {
      queryWhere['discount'] = MoreThanOrEqual(params['discount.gte']);
    }

    if (params['discount.lte'] !== undefined) {
      queryWhere['discount'] = LessThanOrEqual(params['discount.lte']);
    }

    if (params['reportTag.equals'] !== undefined) {
      queryWhere['product'] = { reportTag: +params['reportTag.equals'] };
    }

    if (params['start.gte']) {
      queryWhere['start'] = MoreThanOrEqual(
        moment(params['start.gte'], AppConstant.SUBMIT_TIME_FORMAT).toDate()
      );
    }

    if (params['start.lte']) {
      queryWhere['start'] = LessThanOrEqual(
        moment(params['start.lte'], AppConstant.SUBMIT_TIME_FORMAT).toDate()
      );
    }

    if (params['start.lte'] && params['start.gte']) {
      queryWhere['start'] = Between(params['start.gte'], params['start.lte']);
    }

    if (params['end.lte'] && params['end.gte']) {
      queryWhere['end'] = Between(
        params['end.gte'],
        moment(params['end.lte']).add(1, 'day')
      );
    } else if (params['end.gte']) {
      queryWhere['end'] = MoreThanOrEqual(
        moment(params['end.gte'], AppConstant.SUBMIT_TIME_FORMAT).toDate()
      );
    } else if (params['end.lte']) {
      queryWhere['end'] = LessThanOrEqual(
        moment(params['end.lte'], AppConstant.SUBMIT_TIME_FORMAT)
          .add(1, 'day')
          .toDate()
      );
    }

    if (params['user'] || params['user.equals']) {
      queryWhere['user'] = { id: params.user || params['user.equals'] };
    }

    if (params.type) {
      queryWhere['type'] = params['type'];
    }

    if (params['consumer.equals']) {
      queryWhere['consumer'] = { id: params['consumer.equals'] };
    }

    if (params['service.equals']) {
      queryWhere['product'] = {
        ...queryWhere['product'],
        id: +params['service.equals']
        // type: params.type
      };
    }

    if (params['tax.gt']) {
      queryWhere['tax'] = MoreThan(params['tax.gt']);
    }

    if (params['related.equals'] != undefined) {
      queryWhere['related'] = params['related.equals'];
    }

    if (params['isTransfer.equals'] != undefined) {
      queryWhere['isTransfer'] = params['isTransfer.equals'];
    }

    if (params['submitAt.gte']) {
      queryWhere['submitAt'] = MoreThanOrEqual(moment(params['submitAt.gte']));
    }
    if (params['submitAt.lte']) {
      queryWhere['submitAt'] = LessThanOrEqual(
        moment(params['submitAt.lte']).add('day', 1)
      );
    }

    if (params['submitAt.lte'] && params['submitAt.gte']) {
      queryWhere['submitAt'] = Between(
        moment(params['submitAt.gte']).format(AppConstant.DATE_FORMAT),
        moment(params['submitAt.lte'])
          .add(1, 'day')
          .format(AppConstant.DATE_FORMAT)
      );
    }

    if (!!params['isTurnover']) {
      if (params['submitAt.gte']) {
        queryWhere['submitAt'] = MoreThanOrEqual(
          moment(params['submitAt.gte'])
        );
      }
      if (params['submitAt.lte']) {
        queryWhere['submitAt'] = LessThanOrEqual(
          moment(params['submitAt.lte']).add('day', 1)
        );
      }

      if (params['submitAt.lte'] && params['submitAt.gte']) {
        queryWhere['submitAt'] = Between(
          moment(params['submitAt.gte']).format(AppConstant.DATETIME_FORMAT),
          moment(params['submitAt.lte']).format(AppConstant.DATETIME_FORMAT)
        );
      }
    }

    if (params['type.not']) {
      queryWhere['type'] = Not(params['type.not']);
    }

    if (params['updatedAt.gte']) {
      queryWhere['updatedAt'] = MoreThanOrEqual(
        moment(params['updatedAt.gte'])
      );
    }
    if (params['updatedAt.lte']) {
      queryWhere['updatedAt'] = LessThanOrEqual(
        moment(params['updatedAt.lte']).add('day', 1)
      );
    }

    if (params['updatedAt.lte'] && params['updatedAt.gte']) {
      queryWhere['updatedAt'] = Between(
        params['updatedAt.gte'],
        moment(params['updatedAt.lte']).add(1, 'day')
      );
    }

    if (params['createdAt.gte']) {
      queryWhere['createdAt'] = MoreThanOrEqual(
        moment(params['createdAt.gte'])
      );
    }
    if (params['createdAt.lte']) {
      queryWhere['createdAt'] = LessThanOrEqual(
        moment(params['createdAt.lte']).add('day', 1)
      );
    }

    if (params['saleOrderId.not']) {
      queryWhere['saleOrder'] = Not(IsNull());
    }

    if(params['isCanceled']==='false'){
      queryWhere['isCanceled']=false
      queryWhere['canceledDate']=IsNull()
    }

    if (params['createdAt.lte'] && params['createdAt.gte']) {
      queryWhere['createdAt'] = Between(
        params['createdAt.gte'],
        moment(params['createdAt.lte']).add(1, 'day')
      );
    }

    const globalWhere = [];
    if (params['global.contains']) {
      globalWhere.push(`items.title LIKE '%${params['global.contains']}%'`);
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

    if (!isEmpty(params['id.equals'])) {
      queryWhere['id'] = params['id.equals'];
    }

    if (!isEmpty(params['transferCode.equals'])) {
      queryWhere['transferCode'] = params['transferCode.equals'];
    }

    console.log('queryWhere', queryWhere);

    const query = SaleItem.createQueryBuilder('q')

      .addSelect(
        `(case when order.settle_amount < (order.total_amount) then ${RegisteredServiceStatus.notSettled} else q.status end)`,
        'q_status'
      )
      .leftJoinAndSelect('q.saleOrder', 'order')
      .leftJoinAndSelect('order.shiftWork', 'shiftWork')
      .leftJoinAndSelect('q.consumer', 'consumer')
      .leftJoinAndSelect('q.parent', 'saleItemparent')
      .leftJoinAndSelect('q.user', 'user')
      .leftJoinAndSelect('user.parent', 'parent')
      .leftJoinAndSelect('q.contractor', 'contractor')
      .leftJoinAndSelect('q.locker', 'locker')
      .leftJoinAndSelect('q.product', 'product')
      .leftJoin('product.reportTag', 'reportTag')
      .leftJoin('product.category', 'productCategory')
      .leftJoinAndSelect('q.saleUnit', 'saleUnit')
      .leftJoinAndSelect('q.organizationUnit', 'organizationUnit')
      .leftJoinAndSelect('q.groupClassRoom', 'groupClassRoom');
    if (params['audit']) {
      query.leftJoinAndSelect('q.createdBy', 'c');
      query.leftJoinAndSelect('q.updatedBy', 'u');
    }
    query.where(queryWhere);

    if (params['user.parent']) {
      query.andWhere('parent.id IN (:...ids)', {
        ids: [params['user.parent']]
      });
    }
    if (params.parent) {
      query.andWhere('saleItemparent.id=:id', { id: params.parent });
    }
    if (params.reception !== undefined && params.reception === 'false') {
      query.andWhere(
        '((q.type!=3) OR (q.type=3 AND q.registered_service is null))'
      );
    }

    if (params['totalAmount.gte']) {
      query.andWhere(
        '(q.amount * q.quantity) - (q.discount + q.return_credit )>= :totalAmount',
        { totalAmount: +params['totalAmount.gte'] }
      );
    }

    if (params['totalAmount.lte']) {
      query.andWhere(
        '(q.amount * q.quantity) - (q.discount + q.return_credit )<= :x',
        { x: +params['totalAmount.lte'] }
      );
    }

    if (params['contractor.equals'] || params['contractor']) {
      query.andWhere('contractor.id=:c', {
        c: params['contractor.equals'] || params['contractor']
      });
    }

    if (params['shiftWork'] || params['shiftWork']) {
      query.andWhere('order.shiftWork=:shiftWork', {
        shiftWork: params['shiftWork']
      });
    }

    if (globalWhere.length) query.andWhere(globalWhere?.join(' OR '));
    if (params['status.equals'] != undefined) {
      if (params['status.equals'] == RegisteredServiceStatus.notSettled) {
        query.andWhere(`order.settle_amount < (order.total_amount)`);
      } else {
        query.andWhere(`order.settle_amount = (order.total_amount)`);
        query.andWhere({
          status: +params['status.equals']
        });
      }
    }
    // if (params['start']) {
    //   query.andWhere({
    //     submitAt: MoreThanOrEqual(
    //       moment(
    //         `${params['start']} 00:00`,
    //         AppConstant.SUBMIT_TIME_FORMAT
    //       ).toDate()
    //     )
    //   });
    // }
    // if (params['end']) {
    //   query.andWhere({
    //     submitAt: LessThan(
    //       moment(`${params['end']} 00:00`, AppConstant.SUBMIT_TIME_FORMAT)
    //         .add(1, 'day')
    //         .toDate()
    //     )
    //   });
    // }

    // if (params['start'] && params['end']) {
    //   console.log(moment(params['start'], AppConstant.SUBMIT_TIME_FORMAT));
    //   console.log(
    //     moment(params['end'], AppConstant.SUBMIT_TIME_FORMAT).add(1, 'day')
    //   );

    //   query.andWhere({
    //     submitAt: Between(
    //       moment(params['start'], AppConstant.SUBMIT_TIME_FORMAT),
    //       moment(params['end'], AppConstant.SUBMIT_TIME_FORMAT)
    //     )
    //   });
    // }
    addAuditFilterToQuery(params, query);

    let sortMetaData = createSortQuery(SaleOrder, params, relationOptions);
    for (let s of sortMetaData) {
      query.addOrderBy(`${s.entity ? s.entity : 'q'}.${s.property}`, s.dir);
    }
    return query
      .offset(params.offset || 0)
      .limit(params.limit || 10)
      .getManyAndCount();
  }

  upsert(
    dto: SaleItemDto,
    item: SaleItem,
    saleUnit: SaleUnit,
    products: Product[],
    current: User,
    entityManager: EntityManager
  ) {
    const product = products.find((sup) => sup.id === dto.product);
    if (!product) {
      throw new BadRequestException('Not access to this product');
    }
    if (!current?.isAdmin() && !dto.isArchived) {
      let authorizedSaleUnits;
      if (dto.type == SaleUnitType.Reception) {
        authorizedSaleUnits = product.authorizedDeliveryUnits;
      } else {
        authorizedSaleUnits = product.authorizedSalesUnits;
      }
      if (
        authorizedSaleUnits?.length &&
        authorizedSaleUnits?.every((p) => p.id != saleUnit.id)
      ) {
        throw new BadRequestException('Not access to this product');
      }
    }
    switch (dto?.type) {
      case SaleUnitType.Service:
        return this.registeredProductProvider.upsert(
          dto,
          item,
          product,
          saleUnit,
          current,
          entityManager
        );
      case SaleUnitType.Credit:
        return this.creditProductProvider.upsert(
          dto,
          item,
          product,
          saleUnit,
          current,
          entityManager
        );
      case SaleUnitType.Reception:
        return this.serviceItemService.upsert(
          dto,
          item,
          product,
          saleUnit,
          current,
          entityManager
        );
      case SaleUnitType.Package:
        return this.packageItemService.upsert(
          dto,
          item,
          product,
          saleUnit,
          current,
          entityManager
        );
      default:
        return this.productItemService.upsert(
          dto,
          item,
          product,
          saleUnit,
          current,
          entityManager
        );
    }
  }

  async prepareRemove(
    item: SaleItem,
    saleUnit: SaleUnit,
    current: User,
    manager?: EntityManager
  ) {
    if (item.saleUnitId == saleUnit.id || item.saleUnit.id == saleUnit.id) {
      if (item.type == SaleUnitType.Service) {
        if (item?.usedCredit > 0)
          throw new BadRequestException('Unable delete service');
        if (item.groupClassRoomId) {
          item.groupClassRoomIncrement = -1;
        }
      } else if (item.type == SaleUnitType.Credit) {
        if (item.usedCredit > 0) {
          throw new BadRequestException('Unable delete credit service');
        }
      } else if (item.registeredService?.id || item.registeredServiceId) {
        item.registeredServiceChangeCredit = -item.quantity;
      }
      if (item.contractorIncomes?.length) {
        for (let ci of item.contractorIncomes) {
          ci.deletedAt = new Date();
          ci.deletedBy = current;
        }
      }
      item.deletedAt = new Date();
      item.deletedBy = current;
    }
    return item;
  }

  async getRegisteredService(
    user: number,
    saleUnitId?: number,
    submitAt?: Date,
    related = false,
    offset = 0,
    limit = 50
  ) {
    let query = `q.user = ${user}`;
    if (saleUnitId) {
      query += ` AND (saleUnit.id IS NULL OR saleUnit.id = ${saleUnitId})`;
    }
    let current = submitAt ? moment(submitAt) : moment();
    let day = current.isoWeekday();
    return SaleItem.createQueryBuilder('q')
      .leftJoinAndSelect('q.contractor', 'contractor')
      .leftJoinAndSelect('q.product', 'product')
      .leftJoin('q.saleOrder', 'saleOrder')
      .leftJoinAndSelect('product.contractors', 'contractors')
      .leftJoinAndSelect('contractors.contractor', 'user')
      .leftJoin('product.authorizedDeliveryUnits', 'saleUnit')
      .leftJoin('product.schedules', 'schedules')
      .leftJoin('q.reservationTimes', 'reservationTimes')
      .where(`saleOrder.settle_amount = saleOrder.total_amount`)
      .andWhere({ related: related, locker: IsNull() })
      .andWhere(
        `(reservationTimes.id IS NULL OR 
                (reservationTimes.date = :date AND reservationTimes.from_time <= :time AND
                 reservationTimes.to_time > :time))`,
        {
          date: current.utc(true).format('YYYY-MM-DD'),
          time: current.utc(true).format('HH:mm:ss')
        }
      )
      .andWhere(
        `(q.type = ${SaleUnitType.Service}
               AND q.status = 0
               AND q.start <= '${moment(submitAt)
                 .utc(true)
                 .format(AppConstant.DATE_FORMAT)}'
               AND q.end >= '${moment(submitAt)
                 .utc(true)
                 .format(AppConstant.DATE_FORMAT)}' 
               AND q.credit > q.used_credit)`
      )
      .andWhere(
        `(schedules.id IS NULL OR 
        (schedules.days::jsonb @> '${day}' AND schedules.from_time <= :time AND schedules.to_time > :time))`,
        {
          time: current.utc(true).format('HH:mm:ss')
        }
      )
      .andWhere(query)
      .orderBy('q.id', 'DESC')
      .skip(offset || 0)
      .take(limit || 50)
      .getMany();
  }
}
