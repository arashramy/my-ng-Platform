import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In, LessThan, LessThanOrEqual, MoreThan, MoreThanOrEqual } from 'typeorm';
import moment from 'moment';
import { ProductSchedule } from '../entities/ProductSchedule';
import { ProductPrice } from '../entities/ProductPrice';
import { Product } from '../entities/Product';
import { ProductType } from '../entities/ProductCategory';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';
import { SubProduct } from '../entities/SubProduct';

@Injectable()
export class ProductService {
  PRODUCT_SCHEDULE_START_LIMIT = 15;
  PRODUCT_SCHEDULE_END_LIMIT = 15;

  constructor(private datasource: DataSource) {
  }

  async finds(category: number | number[], saleUnit: number, type: SaleUnitType, submitAt?: Date, offset = 0, limit = 50) {
    let current = submitAt ? moment(submitAt) : moment();
    let day = current.isoWeekday();
    let query = Product.createQueryBuilder('q')
      .leftJoinAndSelect('q.unit', 'unit')
      .leftJoinAndSelect('q.priceList', 'priceList')
      .leftJoinAndSelect('q.contractors', 'contractors')
      .leftJoinAndSelect('contractors.contractor', 'contractor');

    if (type == SaleUnitType.Product || type == SaleUnitType.Reception)
      query.leftJoinAndSelect('q.schedules', 'schedules');
    query.where({ status: true });
    query.leftJoin('q.authorizedSalesUnits', 'authorizedSalesUnits')
      .andWhere('(authorizedSalesUnits.id IS NULL OR authorizedSalesUnits.id = :saleUnit)', { saleUnit: saleUnit });
    if (Array.isArray(category)) {
      query.andWhere({ category: { id: In(category) } });
    } else {
      query.andWhere({ category: { id: category } });
    }
    if (type == SaleUnitType.Product || type == SaleUnitType.Reception) {
      query.andWhere(`(schedules.id IS NULL OR 
        (schedules.days::jsonb @> '${day}' AND schedules.from_time <= :from AND schedules.to_time > :to))`, {
        from: current.format('HH:mm:ss'),
        to: current.format('HH:mm:ss'),
      });
    }
    if (type == SaleUnitType.Service) {
      query.andWhere('q.hasPriceList IS TRUE');
    }
    let result = await query
      .skip(offset || 0)
      .take(limit || 50)
      .getMany();
    if (type == SaleUnitType.Product) {
      result.forEach((value, index) => {
        if (!value.hasPriceList && value.hasSchedules) {
          let schedule = value.findScheduleInTime(submitAt);
          if (schedule?.price) {
            value.price = schedule?.price;
          }
        }
      });
    }
    return result;
  }

  async findSubProducts(id: number) {
    return SubProduct.find({
      where: { parent: { id: id } },
      relations: [
        'product',
        'contractor',
        'price',
      ], cache: 60000,
    });
  }

  async getOpenService(saleUnitId: number, submitAt?: Date, related = false, offset = 0, limit = 50) {
    let current = submitAt ? moment(submitAt) : moment();
    let day = current.isoWeekday();
    let query = Product.createQueryBuilder('q')
      .leftJoinAndSelect('q.priceList', 'priceList')
      .leftJoinAndSelect('q.contractors', 'contractors')
      .leftJoinAndSelect('contractors.contractor', 'contractor')
      .leftJoinAndSelect('q.lockerLocation','lockerLocation')
      .leftJoinAndSelect('q.schedules', 'schedules')
      .where({ status: true, type: ProductType.Service, related: related });
    query.leftJoin('q.authorizedDeliveryUnits', 'authorizedDeliveryUnits')
      .andWhere('(authorizedDeliveryUnits.id IS NULL OR authorizedDeliveryUnits.id = :saleUnit)',
        { saleUnit: saleUnitId || -1 });
    query.andWhere(`(priceList.id IS NULL OR priceList.min = 1)`);
    query.andWhere(`(schedules.id IS NULL OR 
        (schedules.days::jsonb @> '${day}' AND schedules.from_time <= :from AND schedules.to_time > :to))`, {
      from: current.format('HH:mm:ss'),
      to: current.format('HH:mm:ss'),
    });
    let services: Product[] = await query
      .skip(offset || 0)
      .take(limit || 50)
      .getMany();
    services.forEach((value, index) => {
      if (value.hasSchedules) {
        let schedule = value.findScheduleInTime(submitAt);
        if (schedule?.price) {
          value.price = schedule?.price;
        }
      }
    });
    // let ids = services.filter(p => p.hasContractor).map(p => p.id);
    // if (ids?.length) {
    //   let contractors = ProductContractor.find({
    //     where: {product: {id: In(ids)}}, relations: ["contractor"]
    //   });
    // }
    return services;
  }

  async availableProductInTime(
    product: number,
    orgUnit?: number,
    submitAt?: Date,
    manager?: EntityManager,
  ) {
    manager ||= this.datasource.manager;
    let current = (submitAt ? moment(submitAt) : moment()).utc();
    let day = current.isoWeekday();
    return manager
      .createQueryBuilder()
      .from(ProductSchedule, 'q')
      .where({
        product: { id: product },
        organizationUnit: { id: orgUnit },
      })
      .andWhere(`(q.days::jsonb @> '${day}' AND q.from_time <= :from AND q.to_time > :to)`, {
        from: current.utc(true).format('HH:mm:ss'),
        to: current.utc(true).format('HH:mm:ss'),
      }).getExists();
  }

  async findScheduleInTime(
    product: number,
    orgUnit?: number,
    submitAt?: Date,
    manager?: EntityManager,
  ) {
    manager ||= this.datasource.manager;
    let current = (submitAt ? moment(submitAt) : moment()).utc();
    let day = current.isoWeekday();
    return manager
      .createQueryBuilder()
      .from(ProductSchedule, 'q')
      .where({
        product: { id: product },
        organizationUnit: { id: orgUnit },
      })
      .andWhere(`(q.days::jsonb @> '${day}' AND q.from_time <= :from AND q.to_time > :to)`, {
        from: current.format('HH:mm:ss'),
        to: current.format('HH:mm:ss'),
      }).getOne();
  }

  async getProductPriceTimeBased(
    product: number,
    orgUnit?: number,
    submitAt?: Date,
    manager?: EntityManager,
  ) {
    manager ||= this.datasource.manager;
    let current = submitAt ? moment(submitAt) : moment();
    let day = current.isoWeekday();
    return (await manager
      .createQueryBuilder()
      .from(ProductSchedule, 'q')
      .addSelect('json_array_elements_text(q.days)', '_days')
      .where({
        product: { id: product },
        organizationUnit: { id: orgUnit },
        from: current.add(this.PRODUCT_SCHEDULE_START_LIMIT || 15, 'minutes').format('HH:mm:ss'),
        to: current.add(this.PRODUCT_SCHEDULE_END_LIMIT || 15, 'minutes').format('HH:mm:ss'),
      })
      .andWhere(qb =>
        qb.where({ 'q._days': day, fixedSchedules: false }),
      ).getOne())?.price || 0;
  }

  async getProductPriceQuantityBased(
    product: number,
    quantity: number,
    manager: EntityManager,
  ) {
    manager ||= this.datasource.manager;
    let sc = await manager.findOne(ProductPrice, {
      where: {
        product: { id: product },
        max: LessThan(quantity),
        min: MoreThanOrEqual(quantity),
      },
      cache: true,
    });
    return sc ? sc.price : 0;
  }

  async findPriceById(
    product: number,
    priceId: number,
    manager: EntityManager) {
    manager ||= this.datasource.manager;
    return manager.findOne(ProductPrice, {
      where: {
        product: { id: product },
        id: priceId,
      },
      cache: true,
    });
  }

  async findPriceByQuantity(
    product: number,
    quantity: number,
    manager: EntityManager) {
    manager ||= this.datasource.manager;
    return manager.findOne(ProductPrice, {
      where: [
        {
          product: { id: product },
          min: LessThanOrEqual(quantity),
          max: MoreThan(quantity),
        },
        {
          product: { id: product },
          min: quantity,
        },
      ],
      cache: true,
    });
  }

  async findPriceByDuration(
    product: number,
    duration: number,
    manager: EntityManager) {
    manager ||= this.datasource.manager;
    return manager.findOne(ProductPrice, {
      where: {
        product: { id: product },
        duration: duration,
      },
      cache: true,
    });
  }
}
