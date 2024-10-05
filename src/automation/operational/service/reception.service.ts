import { User } from '../../../base/entities/User';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Between,
  DataSource,
  EntityManager,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not
} from 'typeorm';
import moment from 'moment';
import { TransactionService } from './transaction.service';
import { SaleOrderDto } from '../dto/sale-order.dto';
import { SaleOrder } from '../entities/SaleOrder';
import { SaleItemService } from './sale-item.service';
import { ShiftWorkService } from '../../../base/service/shift-work.service';
import { LockerService } from '../../base/service/locker.service';
import { AppConstant } from '../../../common/constant/app.constant';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';
import { SaleItem } from '../entities/SaleItem';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';


@Injectable()
export class ReceptionService {
  constructor(
    private transactionService: TransactionService,
    private datasource: DataSource,
    private eventEmitter: EventEmitter2
  ) {}

  calculateTotalReceptionCondition(params: any) {
    // console.log(params);
    let where: any = {};
    if (params.start && !params.end) {
      where['submitAt'] = MoreThanOrEqual(params.start);
    } else if (!params.start && params.end) {
      where['submitAt'] = LessThanOrEqual(params.end);
    } else {
      where['submitAt'] = Between(
        moment(params.start, AppConstant.SUBMIT_TIME_FORMAT)
          .startOf('day')
          .format(AppConstant.SUBMIT_TIME_FORMAT),
        moment(params.end, AppConstant.SUBMIT_TIME_FORMAT)
          .endOf('day')
          .format(AppConstant.SUBMIT_TIME_FORMAT)
      );
    }
    return where;
  }

  async currentReport(params: any, user: User) {
    let where: any = {};
    if (params.saleUnit) {
      where['saleUnit'] = { id: +params.saleUnit };
    }
    if (params.organizationUnit) {
      where['organizationUnit'] = { id: +params.organizationUnit };
    }
    let whereStartTime: any = {};
    let whereEndTime: any = {};
    if (!params.end) {
      params.end = moment().utc(true).format(AppConstant.DATE_FORMAT);
    }
    if (params.start) {
      whereStartTime['start'] = Between(
        moment(`${params.start} 00:00`, AppConstant.SUBMIT_TIME_FORMAT)
          .startOf('day')
          .toDate(),
        moment(`${params.end} 00:00`, AppConstant.SUBMIT_TIME_FORMAT)
          .add(1, 'day')
          .startOf('day')
          .toDate()
      );
      whereEndTime['end'] = Between(
        moment(`${params.start} 00:00`, AppConstant.SUBMIT_TIME_FORMAT)
          .startOf('day')
          .toDate(),
        moment(`${params.end} 00:00`, AppConstant.SUBMIT_TIME_FORMAT)
          .add(1, 'day')
          .utc(true)
          .startOf('day')
          .toDate()
      );
    } else {
      whereEndTime['end'] = LessThan(
        moment(`${params.end} 00:00`, AppConstant.SUBMIT_TIME_FORMAT)
          .add(1, 'day')
          .startOf('day')
          .toDate()
      );
    }

    const logout =
      (
        await SaleOrder.createQueryBuilder('q')
          .select([])
          .addSelect('SUM(saleItem.persons)', 'count')
          .leftJoin('q.items', 'saleItem')
          .where({
            reception: true,
            ...where,
            ...whereEndTime
          })
          .andWhere('saleItem.type = :type', { type: SaleUnitType.Reception })
          .getRawOne()
      )?.count || 0;
    const todayLogin =
      (
        await SaleOrder.createQueryBuilder('q')
          .select([])
          .addSelect('SUM(saleItem.persons)', 'count')
          .leftJoin('q.items', 'saleItem')
          .where({
            reception: true,
            end: IsNull(),
            ...where,
            ...whereStartTime
          })
          .andWhere('saleItem.type = :type', { type: SaleUnitType.Reception })
          .getRawOne()
      )?.count || 0;
    const login =
      (
        await SaleOrder.createQueryBuilder('q')
          .select([])
          .addSelect('SUM(saleItem.persons)', 'count')
          .leftJoin('q.items', 'saleItem')
          .where({
            reception: true,
            end: IsNull(),
            ...where
          })
          .andWhere('saleItem.type = :type', { type: SaleUnitType.Reception })
          .getRawOne()
      )?.count || 0;

    const totalReception = (
      await SaleItem.createQueryBuilder('q')
        .select([])
        .addSelect('sum(q.quantity)', 'count')
        .where({
          ...where,
          ...this.calculateTotalReceptionCondition(params)
        })
        .andWhere('type = :type', { type: SaleUnitType.Reception })
        .getRawOne()
    )?.count;
    return {
      login: +login,
      logout: +logout,
      todayLogin: +todayLogin,
      todayTotal: totalReception,
      total: +logout + +login
    };
  }

  async logout(dto: SaleOrderDto, current: User) {
    return this.datasource.manager.transaction(async (manager) => {
      let reception = await manager.findOne(SaleOrder, {
        where: { id: dto.id, end: IsNull() },
        relations: ['user', 'saleUnit', 'items', 'items.product']
      });
      if (!reception) {
        throw new BadRequestException('Reception not found');
      }
      let response = await this.doLogout(
        reception,
        dto.transactions,
        dto.end,
        current,
        manager
      );
      this.eventEmitter.emit(EventsConstant.RECEPTION_LOGOUT, response);
      return true;
    });
  }

  async backToLogin(id: number, current: User) {
    return this.datasource.manager.transaction(async (manager) => {
      let reception = await manager.findOne(SaleOrder, {
        where: { id: id, end: Not(IsNull()) },
        relations: ['user', 'saleUnit', 'items', 'items.product']
      });
      if (!reception) {
        throw new BadRequestException('Reception not found');
      }
      reception.end = null;
      reception.updatedAt = new Date();
      reception.updatedBy = current;
      reception = await manager.save(reception);
      this.eventEmitter.emit(EventsConstant.RECEPTION_BACK_TO_LOGIN, reception);
      return true;
    });
  }

  async logoutAll(saleUnit: number, current: User) {
    return this.datasource.manager.transaction(async (manager) => {
      const sId = (current?.accessShops?.map((s) => s.id) || [-1]).join(',');
      const query = SaleOrder.createQueryBuilder('q')
        .leftJoinAndSelect('q.user', 'user')
        .leftJoinAndSelect('q.saleUnit', 'saleUnit')
        .leftJoinAndSelect('q.items', 'items')
        .leftJoinAndSelect('items.product', 'product')
        .where({ end: IsNull() });
      if (!current.isAdmin()) {
        query.andWhere(
          `saleUnit.id IN (${sId}) OR saleUnit.reception IN (${sId})`
        );
      }
      const receptions = await query.getMany();
      const data = [];
      for (const reception of receptions) {
        if (reception.balance == 0) {
          try {
            let response = await this.doLogout(
              reception,
              [],
              null,
              current,
              manager
            );
            data.push(response);
          } catch (error) {
            console.log(error.message);
          }
        }
      }
      this.eventEmitter.emit(EventsConstant.RECEPTION_LOGOUT_ALL, data);
      return data;
    });
  }

  async doLogout(
    reception: SaleOrder,
    transactions: any[],
    end: string,
    current: User,
    manager: EntityManager
  ) {
    if (reception.totalAmount !== reception.settleAmount) {
      throw new BadRequestException('You Must Settle Your Reception Order');
    }
    const orders = await SaleOrder.find({
      where: { receptionSaleOrder: { id: reception.id } }
    });
    const transformedOrders = orders.reduce((acc: any, item) => {
      if (!acc.totalAmount) {
        acc.totalAmount = 0;
        acc.settleAmount = 0;
      }
      acc.totalAmount += item.totalAmount;
      acc.settleAmount += item.settleAmount;
      return acc;
    }, {});
    if (transformedOrders.totalAmount !== transformedOrders.settleAmount) {
      throw new BadRequestException(
        'You Have Normal Order That are not settled'
      );
    }

    manager ||= this.datasource.manager;
    let endTime;
    if (moment(reception.submitAt).isBefore(moment(), 'day')) {
      if (end) {
        let em = moment(end, AppConstant.SUBMIT_TIME_FORMAT);
        if (!em.isValid()) {
          throw new BadRequestException('Invalid end time');
        }
        endTime = em.toDate();
      }
    }
    if (reception.balance != 0) {
      if (transactions?.length) {
        reception.transactions = await this.transactionService.settleSaleOrder(
          transactions,
          reception,
          reception.saleUnit,
          current,
          true,
          manager
        );
      } else {
        throw new BadRequestException('Unable logout!first settle');
      }
    }
    reception.end = endTime || new Date();
    reception.settleAmount = reception.finalAmount;
    reception.updatedAt = new Date();
    reception.updatedBy = current;
    await manager.update(SaleOrder, reception.id, {
      updatedBy: reception.updatedBy,
      updatedAt: reception.updatedAt,
      end: reception.end,
      settleAmount: reception.finalAmount
    });
    return reception;
  }
}
