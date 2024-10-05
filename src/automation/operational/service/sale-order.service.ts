import { User, UserStatus } from '../../../base/entities/User';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Between,
  DataSource,
  EntityManager,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not
} from 'typeorm';
import moment from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { TransactionService } from './transaction.service';
import {
  SaleItemDto,
  SaleOrderDto,
  TransactionItem
} from '../dto/sale-order.dto';
import { SaleOrder, SaleType } from '../entities/SaleOrder';
import { RegisteredServiceStatus, SaleItem } from '../entities/SaleItem';
import { DisabledUserException } from '../../../auth/exceptions/disabled-user.exception';
import { OrganizationUnit } from '../../../base/entities/OrganizationUnit';
import { FiscalYear } from '../../../base/entities/FiscalYears';
import { SaleItemService } from './sale-item.service';
import { Operation } from '../../../common/interceptors/access-organization-fiscal-year.interceptor';
import { ShiftWorkService } from '../../../base/service/shift-work.service';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { GroupClassRoom } from '../../base/entities/GroupClassRoom';
import { LockerService } from '../../base/service/locker.service';
import {
  NeedLockerType,
  ActionAfterUnfairUsageTime,
  Product,
  ProductAlarmType
} from '../../base/entities/Product';
import {
  addAuditFilterToQuery,
  createSortQuery,
  RELATIONS_KEY
} from '../../../common/decorators/mvc.decorator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';
import { TransactionSourceType } from '../../../base/entities/TransactionSource';
import { Project } from '../../../project-management/operational/entities/Project';
import { ReceptionLocker } from '../entities/ReceptionLocker';
import { Location } from '../../../base/entities/Location';
import { TransferType } from '../../../base/entities/TransferType';
import { LoanService } from './loan.service';
import { Setting, SettingKey } from '../../../base/entities/Setting';
import { Payment } from '../../../payment/entities/payment.entity';
import { UserActivityService } from './user-activity.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, retry } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { UserLoan } from '../entities/UserLoan';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';
import { LockerItem } from '../entities/LockerItem';
import { LockerLocationDto } from 'src/automation/base/dto/lockes.dto';
import {
  createOperationDeviceEvent,
  DeviceOperationType,
  OperationNameDevice
} from '../../../remote/device/device.util';
import { DeviceMessage } from 'src/remote/device/device.constant';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ReceptionService } from './reception.service';
import { AutoMationLogoutService } from './automatic-logout.service';

@Injectable()
export class SaleOrderService {
  constructor(
    private transactionService: TransactionService,
    private saleItemService: SaleItemService,
    private shiftWorkService: ShiftWorkService,
    private lockerService: LockerService,
    private loanService: LoanService,
    private datasource: DataSource,
    private eventEmitter: EventEmitter2,
    private userAcitivtyService: UserActivityService,
    private httpService: HttpService,
    private configService: ConfigService,
    private readonly autoMationLogoutService: AutoMationLogoutService
  ) {}

  async findAll(params: any, current: User): Promise<[SaleOrder[], number]> {
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
    if (params.isReserve !== undefined || params['isReserve.equals'] !== undefined) {
      queryWhere['isReserve'] = params.isReserve !== undefined ? params.isReserve : params['isReserve.equals'];
    }
    if (params.isCanceled !== undefined || params['isCanceled.equals'] !== undefined) {
      queryWhere['isCanceled'] = params.isCanceled !== undefined ? params.isCanceled : params['isCanceled.equals'];
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

    if (params['project']) {
      queryWhere['project'] = { id: +params.project };
    }

    if (params['transferType']) {
      queryWhere['transferType'] = { id: +params['transferType'] };
    }

    if (params['location']) {
      queryWhere['location'] = { id: +params.location };
    }

    if (params['project.in']) {
      queryWhere['project'] = {
        id: In(params['project.in'].split(','))
      };
    }

    if (params['saleStatus.equals'] || params['saleStatus.equals'] === 0) {
      queryWhere['saleStatus'] = params['saleStatus.equals'];
    }

    if (params['userOrderLocker.equals']) {
      queryWhere['userOrderLocker'] = params['userOrderLocker.equals'];
    }

    if (params['id.equals']) {
      queryWhere['id'] = params['id.equals'];
    }

    if (params['lockers.items.contains']) {
      const locker = await ReceptionLocker.find({
        where: {
          locker: params['lockers.items.contains'],
          reception: Not(IsNull())
        },
        relations: ['reception']
      });
      queryWhere['id'] =
        locker.length > 0 ? In([...locker.map((e) => e.reception?.id)]) : null;
    }

    if (params['vipLocker.equals']) {
      queryWhere['vipLocker'] = { lockerNumber: +params['vipLocker.equals'] };
    }

    if (params['saleOrderReceptionId.equals']) {
      queryWhere['saleOrderReceptionId'] =
        +params['saleOrderReceptionId.equals'];
    }

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

    if (!!params['items.isOnline']) {
      subQueryWhere['isOnline'] = !!params['items.isOnline'];
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
      .leftJoinAndSelect('user.groups', 'groups')
      .leftJoinAndSelect('q.shiftWork', 'shiftWork')
      .leftJoinAndSelect('q.lockers', 'lockers')
      .leftJoinAndSelect('q.vipLocker', 'vipLocker')
      .leftJoinAndSelect('q.saleUnit', 'saleUnit')
      .leftJoinAndSelect('q.organizationUnit', 'organizationUnit')
      .leftJoinAndSelect('q.project', 'project')
      .leftJoinAndSelect('q.location', 'location')
      .leftJoinAndSelect('location.province', 'province')
      .leftJoinAndSelect('q.event', 'event')
      .leftJoinAndSelect('q.productCategory', 'productCategory')
      .leftJoinAndSelect('q.normalSaleOrder', 'normalSaleOrder')
      .leftJoinAndSelect('normalSaleOrder.user', 'normalSaleOrderUser')
      .leftJoinAndSelect('normalSaleOrder.items', 'normalSaleOrderItems')
      .leftJoinAndSelect('q.transferType', 'transferType')
      .leftJoinAndSelect(
        'q.parentSubProductOrders',
        'parentSubProductOrdersRelation'
      )
      .leftJoinAndSelect(
        'parentSubProductOrdersRelation.items',
        'parentSubProductOrdersRelationItems'
      )
      .leftJoinAndSelect(
        'normalSaleOrderItems.product',
        'normalSaleOrderProduct'
      )
      .leftJoinAndSelect('location.city', 'city');

    if (params.getAlarm || params.getItem) {
      query
        .leftJoinAndSelect('q.items', '_items')
        .leftJoinAndSelect('_items.product', '_product')
        .leftJoinAndSelect('_items.registeredService', 'registeredService');
    }

    if (!reception) {
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
    } else if (params.contractor) {
      query.innerJoin(
        (qb) => {
          return qb
            .from(SaleItem, 'si')
            .leftJoinAndSelect('si.contractor', 'contractor')
            .select([])
            .addSelect('si.sale_order', 'sale_order')
            .where(subQueryWhere)
            .andWhere('si.parent IS NULL')
            .andWhere(`si.contractor=${params.contractor}`)
            .groupBy('si.sale_order');
        },
        'items',
        'items.sale_order=q.id'
      );
    }

    if (params['audit']) {
      query.leftJoinAndSelect('q.createdBy', 'c');
      query.leftJoinAndSelect('q.updatedBy', 'u');
    }

    query
      .where(queryWhere)
      .andWhere(globalWhere.length ? globalWhere?.join(' OR ') : '1=1');
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
    console.log('reception', reception);
    if (reception) {
      if (
        params.loginStatus == 0 ||
        params.loginStatus == 2 ||
        params.loginStatus == 3
      ) {
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
        if (params.loginStatus == 0) {
          query.andWhere({ end: Not(IsNull()) });
        } else if (params.loginStatus == 2) {
          query.andWhere({ end: IsNull() });
        }
      } else if (params.loginStatus == 1) {
        query.andWhere({ end: IsNull() });
      }
    } else {
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

    if (params.getAlarm) {
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

    return query
      .skip(params.offset || 0)
      .take(params.limit || 10)
      .getManyAndCount();
  }

  async findById(id: number) {
    return SaleOrder.findOne({
      where: { id: id },
      relations: [
        'user',
        'items',
        'vipLocker',
        'lockers',
        'saleUnit',
        'organizationUnit',
        'shiftWork'
      ]
    });
  }

  async submit(
    dto: SaleOrderDto,
    current: User,
    callback = (order: any) => {},
    sendCashBack = true,
    isUpdate = false,
    isSendEvent = true
  ) {
    return this.datasource.manager.transaction(async (manager) => {
      const result = await this.doSubmit(
        dto,
        current,
        manager,
        callback,
        sendCashBack,
        isUpdate,
        isSendEvent
      );
      this.eventEmitter.emit(EventsConstant.USER_DETAIL, {
        user: dto.user
      });

      return result;
    });
  }

  async doSubmit(
    dto: SaleOrderDto,
    current: User,
    manager: EntityManager,
    callback = (order: any) => {},
    sendCashBack = true,
    isUpdate = false,
    isSendEvent = true
  ) {
    console.log('dto', dto.saleUnit);
    const saleUnit = await SaleUnit.findOne({
      where: { id: dto.saleUnit },
      relations: { lockerLocation: true }
    });
    console.log(saleUnit.title);
    // throw new BadRequestException('Sale unit not found');
    if (
      !saleUnit ||
      (!dto.isArchived &&
        !dto.isBurn &&
        !current?.hasAccessToSaleUnit(saleUnit.id) &&
        !saleUnit.isOnline &&
        !dto.payment &&
        typeof current !== typeof undefined)
    ) {
      throw new BadRequestException('Sale unit not found');
    }
    if (!dto.isArchived && saleUnit.allowSettle) {
      const amount = dto.items.reduce((sum: number, item) => {
        sum += item.amount * item.quantity - item.discount;
        return sum;
      }, 0);
      if (
        !saleUnit.isOnline &&
        saleUnit.settleForce &&
        !dto.transactions?.length &&
        amount !== 0
      ) {
        throw new BadRequestException('Settle forced');
      }
    }

    dto.organizationUnit = saleUnit.organizationUnitId;
    const now = new Date();
    let order: SaleOrder;

    // if (!dto.isArchived && !saleUnit.allowSettle) {
    //   order = await SaleOrder.findOne({
    //     where: {
    //       id: dto.id,
    //       user: { id: dto.user },
    //       reception: true,
    //       end: IsNull(),
    //       saleUnit: { id: saleUnit?.receptionId }
    //     },
    //     relations: ['items']
    //   });
    //   if (dto.id) {
    //     order = await SaleOrder.findOne({
    //       where: {
    //         id: dto.id
    //       },
    //       relations: ['items']
    //     });
    //   } else if (!order) {
    //     order = new SaleOrder();
    //     order.saleUnit = { id: saleUnit.receptionId } as SaleUnit;
    //   }
    // } else {
    if (dto.id) {
      const where = {
        id: dto.id,
        user: { id: dto.user }
      };
      if (!isUpdate) {
        where['saleUnit'] = { id: saleUnit?.id };
      }
      order = await SaleOrder.findOne({
        where: where,
        relations: [
          'items',
          'items.registeredService',
          'lockers',
          'items.product',
          'items.contractorIncomes',
          'items.contractor',
          'saleUnit',
          'user',
          'items.product.lockerLocation',
          'vipLocker',
          'vipLocker.locker'
        ]
      });
      if (!order) {
        throw new BadRequestException('Sale order not found');
      }
    }
    if (!order) {
      order = new SaleOrder();
      order.saleUnit = saleUnit;
    }
    // }

    const oldLockers = order.lockers;
    // if (dto.lockers.length > 0 && order.lockers && dto.id) {
    //   const oldLocker = order.lockers.find(
    //     (el) => !dto.lockers.includes(el.locker)
    //   );
    //   console.log('diff', oldLocker);
    //   if (oldLocker) {
    //     const newLocker = dto.lockers.find((e) =>
    //       !order.lockers.find((el) => el.locker === e)
    //     );
    //     console.log('newLocker', newLocker);
    //     const orders = await manager.find(SaleOrder, {
    //       where: {
    //         user: { id: order?.user?.id },
    //         receptionSaleOrder: { id: order.id },
    //         userOrderLocker: oldLocker.locker
    //       },
    //       relations: { user: true, receptionSaleOrder: true }
    //     });

    //     console.log('orders', orders.length);
    //     console.log('where', {
    //       user: order?.user?.id,
    //       receptionSaleOrder: order.id,
    //       userOrderLocker: oldLocker.locker
    //     });

    //     const updates = await manager.update(
    //       SaleOrder,
    //       {
    //         user: order?.user?.id,
    //         receptionSaleOrder: order.id,
    //         userOrderLocker: oldLocker.locker
    //       },
    //       {
    //         userOrderLocker: newLocker
    //       }
    //     );
    //     console.log("updatessss",updates)
    //   }
    // }

    if (dto.location) {
      const location = await Location.findOne({
        where: { id: +dto.location, user: { id: dto.user } },
        relations: ['user']
      });

      if (!location) {
        throw new BadRequestException('invalid location');
      }

      // order = { ...order, location } as any;
      order.location = location;
    }

    // console.log('dto.payment', dto.payment);

    if (dto.payment) {
      const payment = await Payment.findOne({
        where: { id: +dto.payment }
      });

      if (!payment) {
        console.log('called payment');
        throw new BadRequestException('invalid payment');
      }

      // order = { ...order, location } as any;
      order.payment = payment;
      // console.log('payment', payment);
      // await order.save()
    }

    if (dto.preSettleSourceId) order.preSettleSourceId = dto.preSettleSourceId;

    if (dto.transferType) {
      const tranferType = await TransferType.findOne({
        where: { id: +dto.transferType as any }
      });
      if (!tranferType) {
        throw new BadRequestException('invalid transfer type id');
      }

      order.transferType = tranferType;
    }
    let oldOrder;
    const saleItems: SaleItem[] = [];
    let ownerItems: SaleItem[] = [];
    if (!order.id) {
      if (!dto.submitAt) {
        order.submitAt = now;
      } else {
        const submitAt = moment(dto.submitAt, AppConstant.SUBMIT_TIME_FORMAT);
        if (!submitAt.isValid() || submitAt.isAfter(moment())) {
          throw new BadRequestException('Invalid submit date format');
        }
        order.submitAt = submitAt.toDate();
      }
      order = await this.processOperation(dto, order);
      order.archived = dto.isArchived;
      if (!dto.user) {
        throw new BadRequestException('user is required');
      }
      if (!order.user) {
        try {
          order.user = await manager.findOneOrFail(User, {
            where: { id: dto.user },
            cache: true
          });
        } catch (e) {
          throw new BadRequestException('User not found');
        }
        if (!order.archived && order.user.status === UserStatus.disabled) {
          throw new DisabledUserException(order.user.disabledDescription);
        }
      }
      order.createdBy = current;
      order.items = [];

      if (dto.project && dto.project.id) {
        try {
          order.project = await manager.findOneOrFail(Project, {
            where: { id: dto.project.id }
          });
        } catch (error) {
          throw new BadRequestException('project not found');
        }
      }

      if (!order.archived) {
        const shift = await this.shiftWorkService.findBy(
          order.submitAt,
          order.organizationUnit?.id
        );
        if (!shift) {
          throw new BadRequestException('Not found shift work');
        }
        order.shiftWork = shift;
      }
      order.start = order.submitAt;
      if (saleUnit.isType(SaleUnitType.Reception)) {
        if (!!dto.items?.find((i) => i.type == SaleUnitType.Reception)) {
          order.reception = true;
          const insuranceSetting = await Setting.findByKey(
            SettingKey.Insurance
          );
          // console.log(
          //   'order createdByDevice',
          //   order.isCreatedByDevice,
          //   dto.isCreatedByDevice
          // );

          if (insuranceSetting && insuranceSetting.checkInsurance) {
            if (!order.user.nationCode && !dto.isCreatedByDevice) {
              throw new BadRequestException(
                "The user's national code has not been entered. Please inquire about insurance again after entering the national code"
              );
            }
            if (!order.user.insuranceExpiredDate && !dto.isCreatedByDevice) {
              throw new BadRequestException('Please inquire first');
            }

            const isExInsurane = order.user.insuranceExpiredDate < new Date();

            if (isExInsurane && !dto.isCreatedByDevice) {
              throw new BadRequestException(
                "The user's insurance has expired. Please inquire again after renewing the insurance"
              );
            }
          }
        }
      }

      if (dto.isBurn) {
        order.isBurn = dto.isBurn;
      }

      if (!order.reception) {
        order.end = order.submitAt;
      }
    } else {
      if (order.reception) {
        if (order.end) {
          throw new BadRequestException('Invalid sale order');
        }
      }

      if ((order.saleUnit?.id || order.saleUnitId) == saleUnit.id) {
        ownerItems = order.items;
      } else {
        for (const item of order.items) {
          if (item.saleUnitId == saleUnit.id) {
            ownerItems.push(item);
          } else {
            saleItems.push(item);
          }
        }
      }
      oldOrder = { ...order };
    }
    let CashBackItems = dto.items;
    const oldItems: SaleItem[] = oldOrder?.items;

    //prepare package items into package sale
    this.prepareParentChildren(ownerItems);

    //process sale items
    let items: SaleItem[] = await this.prepareSaleItems(
      ownerItems,
      dto.items,
      saleUnit,
      order.submitAt,
      current,
      manager
    );

    if (!order.archived) {
      //prepare removed items
      items = [
        ...items,
        ...(await this.prepareRemovedItems(
          ownerItems,
          dto.items,
          saleUnit,
          current,
          manager
        ))
      ];
    }

    for (const item of items) {
      item.organizationUnit ||=
        order.organizationUnit ||
        ({ id: order.organizationUnitId } as OrganizationUnit);
      item.fiscalYear ||=
        order.fiscalYear || ({ id: order.fiscalYearId } as FiscalYear);
      item.user ||= order.user || ({ id: order.userId } as User);
      item.submitAt = order.submitAt;
      item.isBurn = order.isBurn;
    }
    if (
      items?.findIndex(
        (i) =>
          i.type == SaleUnitType.Reception || i.type == SaleUnitType.Product
      ) >= 0
    ) {
      order.saleType = SaleType.Sale;
    } else {
      order.saleType = SaleType.PreSale;
    }
    order.items = [...items, ...saleItems];

    // console.log('oldOrder.items', oldOrder?.items);

    if (oldOrder?.items && oldOrder?.items?.length > 0) {
      const isSale = oldOrder?.items.find(
        (el) =>
          el.product.isCashBack &&
          !el.isCashBack &&
          el.type !== SaleUnitType.Reception
      );
      // console.log('sale', isSale);
      if (isSale) {
        const diffRemoveItems = oldItems.filter(
          (obj1) =>
            !dto.items.some((obj2) => obj1.id === obj2.id) &&
            obj1.product.isCashBack &&
            obj1.type !== SaleUnitType.Reception
        );

        let diffAddItems: SaleItem[] = dto.items.filter(
          (obj1) =>
            !oldItems.some(
              (obj2) =>
                obj1.id === obj2.id && obj2.type !== SaleUnitType.Reception
            )
        ) as any;
        diffAddItems = order.items.filter(
          (e) =>
            diffAddItems.find((el) => e.id === el.id) && e.product.isCashBack
        );

        if (diffRemoveItems.length > 0) {
          const cashBackOrders = await manager.find(SaleOrder, {
            where: {
              cashBackParent: { id: (order as SaleOrder).id },
              items: { isCashBack: true }
            },
            relations: { cashBackParent: true, items: true }
          });
          if (cashBackOrders && cashBackOrders.length > 0) {
            if (cashBackOrders.find((e) => e.items[0].usedCredit !== 0)) {
              throw new BadRequestException(
                'you use the cash back can not delete it'
              );
            } else {
              for (let index = 0; index < cashBackOrders.length; index++) {
                const element = cashBackOrders[index];
                await this.delete(element.id, current);
              }
            }
          } else {
            throw new BadRequestException('you can not change cash back items');
          }
          CashBackItems = dto.items;
        }
        if (
          diffAddItems.length > 0 ||
          (diffAddItems.length === 0 && diffRemoveItems.length === 0)
        ) {
          CashBackItems = dto.items.filter(
            (e) => !ownerItems.find((el) => e.id === el.id)
          );
        }
      }
    }
    console.log('called2');

    let no_need_locker = true;
    let lockerLocationItems = [];

    console.log(
      'order items',
      order.items.map((e) => ({
        person: e.persons,
        deletedAt: e.deletedAt,
        quantity: e.quantity
      }))
    );

    console.log(
      dto.items.map((e) => ({ quantity: e.quantity, person: e.persons }))
    );

    if (saleUnit.autoAssign || dto?.isCreatedByDevice) {
      lockerLocationItems = this.prepareLockerLocationItems(order, saleUnit);
    }

    let events = [];
    if (!order.archived) {
      if (order.reception && !order.id) {
        const vipLocker = await this.prepareVipLocker(order, saleUnit, manager);
        console.log('vipLocker', vipLocker);
        if (vipLocker) {
          lockerLocationItems = this.upDateLockerLocationItemVip(
            saleUnit,
            lockerLocationItems,
            vipLocker
          );
          events.push({
            channel: EventsConstant.LOCKER_ASSIGNED,
            data: order.vipLocker
          });
        }
      }
      const [lockerResult, lockerEvents] = await this.prepareLockers(
        dto,
        order,
        saleUnit,
        current,
        saleUnit.autoAssign || dto?.isCreatedByDevice
          ? lockerLocationItems.length > 0
          : dto.lockers.length > 0,
        lockerLocationItems,
        dto?.isCreatedByDevice
      );
      // console.log('lockerResult', lockerResult);
      order.lockers = lockerResult;
      events = [...events, ...lockerEvents];
      if (order.reception && !order.id) {
        await this.prepareVipLocker(order, saleUnit, manager);
        events.push({
          channel: EventsConstant.LOCKER_ASSIGNED,
          data: order.vipLocker
        });
      }
    }
    //! check update part

    const orderLockers = order.lockers?.filter((l) => !l.deletedAt);
    console.log(
      'locker items--------------------',
      orderLockers.map((e) => e.locker)
    );
    if (orderLockers && orderLockers.length > 0 && oldLockers && dto.id) {
      const diffItems = oldLockers.filter(
        (e) => !orderLockers.find((el) => e.locker === el.locker)
      );

      const diffLength = Math.abs(oldLockers.length - orderLockers.length);
      console.log('condition diffItems', diffItems, diffLength);
      if (
        (diffItems.length > 1 && diffLength === 0) ||
        (diffItems.length - diffLength > 0 && diffLength > 0)
      ) {
        throw new BadRequestException('you can not change more that 1');
      }
      if (diffItems.length === 1 && diffLength === 0) {
        const newLocker = orderLockers.find(
          (e) => !oldLockers.find((el) => el.locker === e.locker)
        )?.locker;
        if (newLocker) {
          await manager.update(
            SaleOrder,
            {
              user: order?.user?.id,
              receptionSaleOrder: order.id,
              userOrderLocker: diffItems[0].locker
            },
            {
              userOrderLocker: newLocker
            }
          );
        }
      } else if (diffItems.length > 0) {
        const sortedLocker = orderLockers.sort((a, b) =>
          a.id - b.id > 0 ? 1 : -1
        )[0]?.locker;
        if (!sortedLocker) {
          throw new BadRequestException('you can not remove all items');
        }
        console.log('called', [...diffItems.map((e) => e.locker)]);
        await manager.update(
          SaleOrder,
          {
            user: order?.user?.id,
            receptionSaleOrder: order.id,
            userOrderLocker: In([...diffItems.map((e) => e.locker)])
          },
          {
            userOrderLocker: sortedLocker
          }
        );
      }
    }

    if (order.saleType === SaleType.Sale && !order.invoiceNo) {
      const orders = await manager.find(SaleOrder, {
        where: { saleType: SaleType.Sale },
        select: ['invoiceNo'],
        take: 1,
        order: { invoiceNo: 'DESC' }
      });
      if (orders.length) {
        order.invoiceNo = (orders[0].invoiceNo || 0) + 1;
      }
    }

    for (const item of order.items) {
      if (
        item.type == SaleUnitType.Reception &&
        item?.registeredServiceChangeCredit
      ) {
        const updatedCredit = await manager
          .createQueryBuilder()
          .update(SaleItem)
          // -item.registeredServiceChangeCredit for retrunValue
          .set({
            usedCredit: () =>
              `used_credit + (${item.registeredServiceChangeCredit})`,
            isBurn: !!dto.isBurn
          })
          .where({ id: item.registeredServiceId || item.registeredService?.id })
          .andWhere('(credit - used_credit >= :used_credit)', {
            used_credit: -item.registeredServiceChangeCredit
          })
          .execute();
        if (!updatedCredit.affected) {
          throw new BadRequestException('Unable update usage credit');
        }
        if (item.registeredService.groupClassRoomIncrement) {
          await manager
            .createQueryBuilder()
            .update(GroupClassRoom)
            .set({
              filled: () =>
                `filled + (${item.registeredService.groupClassRoomIncrement})`
            })
            .where({
              id:
                item.registeredService.groupClassRoom?.id ||
                item.registeredService?.groupClassRoomId
            })
            .execute();
        }
      }
      if (item.type == SaleUnitType.Service && item.groupClassRoomIncrement) {
        await manager
          .createQueryBuilder()
          .update(GroupClassRoom)
          .set({ filled: () => `filled + (${item.groupClassRoomIncrement})` })
          .where({ id: item.groupClassRoom.id || item.groupClassRoomId })
          .andWhere('(quantity > filled)')
          .execute();
      }
    }
    order.reception = !!order.items.find(
      (i) => !i.deletedAt && i.type == SaleUnitType.Reception
    );

    if (dto.cashBackParent) {
      const cashBackParentOrder = await manager.findOne(SaleOrder, {
        where: { id: +dto.cashBackParent }
      });

      if (!cashBackParentOrder) {
        throw new BadRequestException('invalid cashBackParent id');
      }
      // console.log('cashBackParent dtooooo', dto.cashBackParent);
      order.cashBackParent = cashBackParentOrder;
    }

    // console.log('cashBackParent dtooooo222222222222222', dto.cashBackParent);

    if (order.reception) {
      for (const item of order.items) {
        if (item.quantity > 0) {
          let registeredServiceId =
            item.registeredService?.saleOrderId ||
            item.registeredService?.saleOrder?.id;

          let firstNotPaidInstallmentLoan =
            await this.loanService.getFirstNotPaidInstallmentLoan(
              dto.user,
              registeredServiceId
            );

          if (firstNotPaidInstallmentLoan) {
            let payTime = moment(
              firstNotPaidInstallmentLoan.payTime,
              AppConstant.DATE_FORMAT
            );
            let dateNow = moment(new Date(), AppConstant.DATE_FORMAT);

            // console.log('dateNow : ', dateNow);
            // console.log('notPaidInstallmentLoan.payTime : ', payTime);

            if (payTime <= dateNow) {
              throw new BadRequestException('User Has UnPaid Installment Loan');
            }
          }
        }
      }
    }

    const isReceptionSaleOrder = order.items.find(
      (e) => e.type === SaleUnitType.Reception
    );
    if (!dto.id && isReceptionSaleOrder) {
      order.saleOrderReceptionId =
        +(
          (
            await SaleOrder.findOne({
              where: {
                saleOrderReceptionId: Not(IsNull()),
                deletedAt: IsNull(),
                user: { id: dto.user } //related to bug : unrelated user in normal saleorder
              },
              order: { saleOrderReceptionId: -1 },
              relations: { user: true }
            })
          )?.saleOrderReceptionId || 0
        ) + 1;
    }

    if (!dto.id && !isReceptionSaleOrder) {
      const lastReceptionSaleOrder = await SaleOrder.findOne({
        where: {
          user: {
            id: dto.user
          },
          saleOrderReceptionId: Not(IsNull()),
          deletedAt: IsNull(),
          end: IsNull(),
          saleUnit: {
            id: saleUnit.allowSettle ? saleUnit.id : saleUnit.receptionId
          }
        },
        order: { saleOrderReceptionId: -1 },
        relations: {
          items: true,
          user: true //related to bug : unrelated user in normal saleorder
        }
      });
      if (lastReceptionSaleOrder) {
        order.receptionSaleOrder = lastReceptionSaleOrder;
        order.saleOrderReceptionId = lastReceptionSaleOrder?.id;
      }
    }
    order.dto = { ...dto, items: dto.items.map((item) => ({ ...item })) };
    order.discount = order.totalDiscount;
    order.isReserve = dto.isReserve;
    order.description = dto.description;
    order.tax = order.totalTax;
    order.description = dto.description;
    order.isCreatedByDevice = !!dto.isCreatedByDevice;
    order.event = dto.event;
    order.productCategory = dto.productCategory;
    order.isTransfer = dto.isTransfer;
    order.isGift = !!dto.isGift;
    if (dto.parentSubProductOrders) {
      order.parentSubProductOrders = dto.parentSubProductOrders;
    }
    order.totalAmount = order.finalAmount;
    if (dto.userOrderLocker) order.userOrderLocker = dto.userOrderLocker;
    order.saleStatus = dto.saleStatus;
    if (dto?.items?.find((e) => e?.isTransfer)) {
      order.settleAmount = order.totalAmount;
    }
    order.meta = order.items
      ?.filter((i) => !i.deletedAt && !i.parentId && !i.parent)
      .map((i) => i.title)
      .join(', ');
    order.settleAmount = order.settleAmount || 0;
    const editOrder = !!order.id;
    if (order.archived) {
      order.end = new Date();
    }
    if (order.id) {
      order.updatedBy = current;
      order.updatedAt = new Date();
    }
    order = await manager.save(order);
    if (order.balance != 0) {
      if (
        order.archived ||
        saleUnit.isType(SaleUnitType.Reception) ||
        saleUnit.allowSettle ||
        saleUnit.isOnline
      ) {
        if (
          !order.archived &&
          saleUnit.settleForce &&
          !dto.transactions?.length &&
          !saleUnit.isOnline
        ) {
          throw new BadRequestException('Invalid settle');
        }
        if (dto.transactions?.length) {
          order.transactions = await this.transactionService.settleSaleOrder(
            dto.transactions,
            order,
            saleUnit,
            current,
            editOrder,
            manager
          );
        }
      }
    }

    if (!order.archived)
      order.lockers = order.lockers?.filter((l) => !l.deletedAt);
    for (const event of events) {
      try {
        this.eventEmitter.emit(event.channel, event.data);
      } catch (e) {}
    }
    await callback(order);
    console.log('calle-----------------------------1217');
    await manager.save(order);

    //!!!
    this.autoMationLogoutService.automaticlyRegisterUnFairCronJob(order,oldItems);

    if (isSendEvent) {
      this.eventEmitter.emit(EventsConstant.ORDER_SAVE, [
        oldOrder,
        order,
        isUpdate
      ]);
    }
    this.eventEmitter.emit(
      EventsConstant.ORDER_SAVED_CHECK_GIFT_PACKAGE,
      order
    );

    if (sendCashBack && !order.reception) {
      this.eventEmitter.emit(EventsConstant.CASH_BACK_PROCESS, {
        settleAmount: order.settleAmount,
        totalAmount: order.totalAmount,
        items: CashBackItems,
        current,
        submitAt: order.submitAt,
        orgUnitId: dto.organizationUnit,
        saleUnitId: dto.saleUnit,
        userId: order.userId,
        fiscalYearId: order.fiscalYear,
        cashBackParent: order?.id
      });
    }
    if (isSendEvent) {
      this.eventEmitter.emit(EventsConstant.USER_ACTIVITY, order);
    }

    return order.id;
  }

  async prepareLockers(
    dto: SaleOrderDto,
    order: SaleOrder,
    saleUnit: SaleUnit,
    current: User,
    needLocker: boolean,
    lockerLocationItems: any[],
    mustAssignAutomaticly?: boolean
  ) {
    if (needLocker) {
      if (dto.lockerQuantity > 0) {
        const events = [];
        const lockers = await this.lockerService.assign(
          saleUnit,
          dto.lockerQuantity,
          dto.lockers,
          order.lockers,
          lockerLocationItems,
          mustAssignAutomaticly
        );
        for (const locker of lockers) {
          if (locker.deletedAt) {
            locker.deletedBy = current;
            events.push({
              channel: EventsConstant.LOCKER_UNASSIGNED,
              data: locker
            });
          } else if (!locker.createAt) {
            locker.createdAt = new Date();
            locker.createdBy = current;
            events.push({
              channel: EventsConstant.LOCKER_ASSIGNED,
              data: locker
            });
          }
        }
        return [lockers, events];
      }
    }
    return [[], []];
  }

  async prepareVipLocker(
    order: SaleOrder,
    saleUnit: SaleUnit,
    manager: EntityManager
  ) {
    const vipLocker = await this.lockerService.getUserVipLocker(
      order.user?.id || order.userId,
      saleUnit.id,
      order.submitAt
    );
    if (vipLocker) {
      if (
        (await manager.count(SaleOrder, {
          where: {
            end: IsNull(),
            saleUnit: { id: saleUnit.id },
            vipLocker: { id: vipLocker.id },
            reception: true
          }
        })) > 0
      ) {
        throw new BadRequestException(
          'Unable assign locker!locked by another user'
        );
      }
      order.vipLocker = vipLocker;
      return vipLocker;
    }
  }

  async delete(id: number, current: User) {
    return this.datasource.manager.transaction(async (manager) => {
      const registeredServices = [];
      const groupClassRooms = [];
      const contractorIncome = [];
      let order: SaleOrder = await SaleOrder.findOne({
        where: [
          { id: id, end: IsNull(), reception: true, archived: false },
          { id: id, reception: false, archived: false }
        ],
        relations: [
          'transactions',
          'transactions.user',
          'items',
          'items.product',
          'items.registeredService',
          'items.contractorIncomes',
          'lockers',
          'user'
        ]
      });
      this.autoMationLogoutService.deleteSaleOrderJob(order.id,order.items)
      if (order?.lockers) {
        await ReceptionLocker.update(
          { id: In(order.lockers.map((l) => l.id)) },
          { deletedAt: new Date(), deletedBy: current }
        );
      }
      if (!order) {
        throw new BadRequestException('Order not found');
      }
      for (const item of order?.items) {
        if (item.type == SaleUnitType.Service && item.usedCredit > 0) {
          throw new BadRequestException('Unable delete service');
        } else if (item.type == SaleUnitType.Credit) {
          if (item?.usedCredit > 0) {
            throw new BadRequestException('Unable delete credit service');
          }
        } else if (item?.registeredService) {
          item.registeredService.usedCredit -= item?.quantity;
          registeredServices.push(item.registeredService);
        }
        if (item.groupClassRoomId) {
          groupClassRooms.push(item.groupClassRoomId);
        }
        if (item.contractorIncomes?.length) {
          for (const ci of item.contractorIncomes) {
            ci.deletedBy = current;
            ci.deletedAt = new Date();
            contractorIncome.push(ci);
          }
        }
        if (!item.isCashBack && item.product.isCashBack) {
          //sale order normal with cash back
          const cashBack = await manager.findOne(SaleOrder, {
            where: { cashBackParent: { id: +order.id } },
            relations: { cashBackParent: true, items: true }
          });
          if (cashBack && cashBack.items.length > 0) {
            //  cash back sale order should delete automatically
            if (cashBack.items[0]?.usedCredit !== 0) {
              //this cash back has been used
              throw new BadRequestException(
                'you use the cash back can not delete it'
              ); //! fix this
            } else {
              try {
                await this.delete(cashBack.id, current);
              } catch (error) {
                throw new BadRequestException(error?.message);
              }
            }
          } else {
            const cashBackOrders = await manager.find(SaleOrder, {
              where: {
                submitAt: order.submitAt,
                user: { id: order.user.id },
                items: { isCashBack: true }
              },

              relations: { user: true, items: true }
            });

            if (cashBackOrders.length > 0) {
              if (cashBackOrders.find((e) => e.items[0].usedCredit !== 0)) {
                throw new BadRequestException(
                  'you use the cash back can not delete it'
                );
              } else {
                throw new BadRequestException(
                  `please first delete sale orders (${cashBackOrders
                    .map((e) => e.id)
                    .join(',')})`
                );
              }
            }
          }
        }

        if (item.isCashBack) item.deletedBy = current;
        item.deletedAt = new Date();
      }

      for (const item of order?.items) {
        item.deletedAt = new Date();
        item.deletedBy = current;
      }
      if (registeredServices.length) {
        await manager.save(registeredServices);
      }
      if (groupClassRooms?.length) {
        await manager
          .createQueryBuilder()
          .update(GroupClassRoom)
          .set({ filled: () => `filled + 1` })
          .where({ id: In(groupClassRooms) })
          .execute();
      }
      if (contractorIncome.length) {
        await manager.save(contractorIncome);
      }
      const events = [];
      let walletTrx;
      for (const trx of order.transactions) {
        await this.transactionService.doRemoveTransaction(
          trx,
          false,
          current,
          false,
          manager
        );
        events.push({
          channel: `${EventsConstant.TRANSACTION_REMOVE}${trx.sourceType}`,
          data: trx
        });
        if (trx.sourceType == TransactionSourceType.UserCredit) {
          walletTrx = trx;
        }
      }
      if (walletTrx) {
        await this.transactionService.normalizeTransactionAfterDate(
          walletTrx.user?.id || walletTrx.userId,
          walletTrx.submitAt,
          current,
          manager
        );
      }
      order.deletedAt = new Date();
      order.deletedBy = current;
      order = await manager.save(order);
      this.eventEmitter.emit(EventsConstant.ORDER_DELETE, order);
      this.eventEmitter.emit(EventsConstant.USER_ACTIVITY, order);
      for (const e of events) {
        this.eventEmitter.emit(e.channel, e.data);
      }
      return true;
    });
  }

  async settleMultipleSaleOrder(
    dtos: {
      orderIds: number[];
      transactions: TransactionItem[];
    },
    current: User
  ) {
    const orders = await SaleOrder.find({ where: { id: In(dtos.orderIds) } });
    const newDtos = orders.reduce((orderTransaction, order, currentIndex) => {
      let newTransactions = {
        id: order.id,
        transaction: [],
        amount: order.totalAmount - order.settleAmount
      };
      for (let i = 0; i < dtos.transactions.length; i++) {
        const settleTransaction = dtos.transactions?.[i];
        if (newTransactions.amount !== 0 && settleTransaction?.amount) {
          const remainSettleTransactionAmount =
            newTransactions.amount - settleTransaction?.amount;

          if (remainSettleTransactionAmount > 0) {
            // 300,000 - 200,000 = 100,000
            newTransactions.transaction.push({ ...dtos.transactions[i] });
            newTransactions.amount -= settleTransaction.amount;
            dtos.transactions[i].amount = 0;
          } else if (remainSettleTransactionAmount < 0) {
            // 50,000 - 150,000 = -100,000
            dtos.transactions[i] = {
              ...dtos.transactions[i],
              amount: remainSettleTransactionAmount * -1
            };
            newTransactions.transaction.push({
              ...dtos.transactions[i],
              amount: newTransactions.amount
            });
            newTransactions.amount = 0;
          } else {
            newTransactions.transaction.push({ ...dtos.transactions[i] });
            dtos.transactions[i].amount = 0;
            newTransactions.amount = 0;
          }
        }
      }
      if (newTransactions.transaction.length) {
        orderTransaction.push({
          id: newTransactions.id,
          transactions: newTransactions.transaction
        });
      }
      return orderTransaction;
    }, []);

    const successSettled = [];
    let isFailed = false;
    for (let i = 0; i < newDtos.length; ) {
      console.log('newDtos', newDtos[i]);
      try {
        const isSettled = await this.settle(newDtos[i], current);
        if (isSettled) {
          console.log(`order ${newDtos[i].id} success`);
          successSettled.push(newDtos[i].id);
        } else {
          isFailed = true;
          console.log(`order ${newDtos[i].id} failed`);
        }
      } catch (error) {
        isFailed = true;
        console.log(`order ${newDtos[i].id} error`, error.message);
      } finally {
        i++;
      }

      if (isFailed) {
        break;
      }
    }

    return successSettled;
  }

  async settle(dto: SaleOrderDto, current: User) {
    return this.datasource.manager.transaction(async (manager) => {
      const order = await manager.findOne(SaleOrder, {
        where: { id: dto.id },
        relations: ['user', 'items', 'saleUnit']
      });
      if (!order) {
        throw new BadRequestException('Order not found');
      }
      const old = { ...order };
      order.transactions = await this.transactionService.settleSaleOrder(
        dto.transactions,
        order,
        order.saleUnit,
        current,
        true,
        manager
      );
      this.eventEmitter.emit(EventsConstant.ORDER_SETTLED, [old, order]);
      return true;
    });
  }

  async processOperation(operation: Operation, order: SaleOrder) {
    order.organizationUnit = new OrganizationUnit();
    if (
      typeof operation?.organizationUnit == 'number' ||
      typeof operation?.organizationUnit == 'string'
    ) {
      order.organizationUnit.id = +operation.organizationUnit;
    } else if ((operation?.organizationUnit as OrganizationUnit)?.id) {
      order.organizationUnit.id = +operation.organizationUnit?.id;
    }
    if (!order.organizationUnit.id) {
      throw new BadRequestException('Not found organization unit');
    }
    order.fiscalYear = new FiscalYear();
    if (
      typeof operation?.fiscalYear == 'number' ||
      typeof operation?.fiscalYear == 'string'
    ) {
      order.fiscalYear.id = +operation.fiscalYear;
    } else if ((operation?.fiscalYear as FiscalYear)?.id) {
      order.fiscalYear.id = +operation.fiscalYear?.id;
    }
    if (!order.fiscalYear.id) {
      order.fiscalYear = await FiscalYear.findOne({
        where: {
          start: LessThanOrEqual(order.submitAt || new Date()),
          end: MoreThanOrEqual(order.submitAt || new Date())
        }
      });
    }
    if (!order?.fiscalYear?.id) {
      throw new BadRequestException('Not found fiscal year');
    }
    return order;
  }

  private prepareParentChildren(ownerItems: SaleItem[]) {
    const parentMap: Map<number, SaleItem[]> = ownerItems
      ?.filter((x) => x.parentId)
      .reduce((a: Map<number, SaleItem[]>, b) => {
        if (!a.has(b.parentId)) {
          a.set(b.parentId, []);
        }
        a.get(b.parentId).push(b);
        return a;
      }, new Map<number, SaleItem[]>());
    for (const parentId of parentMap.keys()) {
      const parent = ownerItems?.find((p) => p.id == parentId);
      if (parent) {
        parent.items = parentMap.get(parentId);
      }
    }
  }

  async prepareSaleItems(
    ownerItems: SaleItem[],
    dtoList: SaleItemDto[],
    saleUnit: SaleUnit,
    submitAt: Date,
    current?: User,
    manager?: EntityManager
  ) {
    const productIds = [
      ...ownerItems.map((item) => item.productId),
      ...(dtoList?.map((p) => p.product) || [])
    ];
    const products = await manager.find(Product, {
      where: { id: In(productIds) },
      relations: [
        'priceList',
        'partners',
        'authorizedSalesUnits',
        'authorizedDeliveryUnits',
        'schedules',
        'lockerLocation'
      ]
    });
    const out = [];
    for (const item of dtoList) {
      item.submitAt = submitAt;
      let oldItem = ownerItems?.find((p) => p.id == item.id);
      if (!oldItem) {
        if (item.type == SaleUnitType.Reception) {
          oldItem = ownerItems?.find(
            (p) =>
              p.productId == item.product &&
              p.type == SaleUnitType.Reception &&
              p.registeredServiceId == item.registeredService
          );
        } else {
          oldItem = ownerItems?.find(
            (p) => p.productId == item.product && p.type == item.type
          );
        }
      }
      if (!oldItem?.parentId) {
        const result = await this.saleItemService.upsert(
          item,
          oldItem,
          saleUnit,
          products,
          current,
          manager
        );
        if (result?.items) {
          for (const child of result?.items) {
            child.parent = result;
            out.push(child);
          }
        }
        out.push(result);
      }
    }

    return out;
  }

  async prepareRemovedItems(
    ownerItems: SaleItem[],
    dtoList: SaleItemDto[],
    saleUnit: SaleUnit,
    current?: User,
    manager?: EntityManager
  ) {
    const items = [];

    for (const item of ownerItems) {
      const cartItem = dtoList?.find((p) => p.id === item.id);
      if (!cartItem) {
        items.push(
          await this.saleItemService.prepareRemove(
            item,
            saleUnit,
            current,
            manager
          )
        );
        if (item.type == SaleUnitType.Package) {
          for (const child of ownerItems) {
            if ((child.parentId || child.parent?.id) == item.id) {
              child.deletedAt = new Date();
              child.deletedBy = current;
              items.push(child);
            }
          }
        }
      }
    }
    console.log('items.length', items.length);
    return items;
  }

  async getValidChargingService(user: number, saleUnitId?: number) {
    const today = moment().format('YYYY/MM/DD');
    const chargingServices = await SaleItem.find({
      where: {
        status: RegisteredServiceStatus.opened,
        user: { id: user },
        type: SaleUnitType.Credit,
        end: MoreThanOrEqual(today as any),
        start: LessThanOrEqual(today as any)
      },
      relations: {
        saleOrder: true,

        product: {
          schedules: true,
          subProducts: {
            product: { contractors: { contractor: true }, schedules: true }
          },
          tagProductParent: true
        }
      }
    });

    const validChargingServices = chargingServices.filter((chargingService) =>
      chargingService.credit > chargingService.usedCredit &&
      chargingService.saleOrder.totalAmount ===
        chargingService.saleOrder.settleAmount &&
      chargingService?.product?.schedules?.length === 0
        ? true
        : chargingService.product.schedules.find((e) => {
            var startTime = moment(e.from, 'HH:mm:ss');
            var endTime = moment(e.to, 'HH:mm:ss');
            var currentTime = moment(new Date(), 'HH:mm:ss');
            return (
              e.days.includes(moment().isoWeekday()) &&
              currentTime.isBetween(startTime, endTime)
            );
          })
    );

    let saleUnit;

    if (saleUnitId) {
      saleUnit = await SaleUnit.findOne({
        where: { id: saleUnitId }
      });
    }

    return {
      validChargingServices,
      validChargingServicesLength: validChargingServices.length,
      saleUnit
    };
  }

  async getValidRegisteredService(user: number, saleUnitId: number) {
    const today = moment().format('YYYY/MM/DD');
    const registeredServices = await SaleItem.find({
      where: {
        user: { id: user },
        status: RegisteredServiceStatus.opened,
        type: SaleUnitType.Service,
        end: MoreThanOrEqual(today as any),
        start: LessThanOrEqual(today as any),
        product: {
          isLocker: false,
          isInsuranceService: false,
          isSubscriptionService: false
        },
        related: false
      },
      relations: {
        saleOrder: true,
        saleUnit: true,
        contractor: true,
        registeredService: true,
        product: {
          contractors: {
            contractor: true
          },
          schedules: true
        }
      }
    });
    const validRegisteredService = registeredServices.filter((rgs) => {
      return (
        rgs.credit > rgs.usedCredit &&
        rgs.saleOrder?.totalAmount === rgs.saleOrder?.settleAmount &&
        (rgs?.product?.schedules?.length === 0
          ? true
          : !!rgs.product.schedules.find((e) => {
              var startTime = moment(e.from, 'HH:mm:ss');
              var endTime = moment(e.to, 'HH:mm:ss');
              var currentTime = moment(new Date(), 'HH:mm:ss');
              return (
                e.days.includes(moment().isoWeekday()) &&
                currentTime.isBetween(startTime, endTime)
              );
            }))
      );
    });

    let saleUnit;

    if (saleUnitId) {
      saleUnit = await SaleUnit.findOne({
        where: { id: saleUnitId }
      });
    }

    const registeredServiceLength = validRegisteredService.length;

    let firstNotPaidInstallmentLoan = null;
    for (const registeredService of registeredServices) {
      let notPaidInstallmentLoan =
        await this.loanService.getFirstNotPaidInstallmentLoan(
          user,
          registeredService.saleOrder.id
        );

      if (notPaidInstallmentLoan) {
        let payTime = moment(
          notPaidInstallmentLoan.payTime,
          AppConstant.DATE_FORMAT
        );
        let dateNow = moment(new Date(), AppConstant.DATE_FORMAT);

        console.log('dateNow : ', dateNow);
        console.log('notPaidInstallmentLoan.payTime : ', payTime);

        if (payTime <= dateNow) {
          firstNotPaidInstallmentLoan = notPaidInstallmentLoan;
        }
      }
    }

    return {
      saleUnit,
      registeredServiceLength,
      registeredServices: validRegisteredService,
      firstNotPaidInstallmentLoan: firstNotPaidInstallmentLoan
    };
  }

  getSubscriptionServiceByUserId(userId: number) {
    return SaleItem.findOne({
      where: {
        user: { id: userId },
        product: { isSubscriptionService: true },
        end: MoreThanOrEqual(new Date()),
        status: RegisteredServiceStatus.opened
      },
      order: { createdAt: -1 }
    });
  }

  async getTaxSaleOrderService(params: any, current: User) {
    let queryWhere = {};
    let subQueryWhere = {};

    const value = await Setting.findByKey(SettingKey.SendToTax);

    console.log('isSingle', value?.isSingle);
    if (typeof value?.isSingle === typeof undefined) {
      throw new BadRequestException('make sure about your type');
    }

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
    if (params['sentToTaxStatus']) {
      queryWhere['sentToTaxStatus'] = params['sentToTaxStatus'];
    }

    if (params['saleUnit']) {
      queryWhere['saleUnit'] = { id: +params['saleUnit'] };
    }

    console.log(queryWhere);

    const query = SaleOrder.createQueryBuilder('q')
      .leftJoinAndSelect('q.user', 'user')
      .leftJoinAndSelect('q.shiftWork', 'shiftWork')
      .leftJoinAndSelect('q.lockers', 'lockers')
      .leftJoinAndSelect('q.vipLocker', 'vipLocker')
      .leftJoinAndSelect('q.saleUnit', 'saleUnit')
      .leftJoinAndSelect('q.organizationUnit', 'organizationUnit')
      .leftJoinAndSelect('q.productCategory', 'productCategory')
      .leftJoinAndSelect('q.items', '_items')
      .leftJoinAndSelect('_items.product', '_product')
      .leftJoinAndSelect('_items.registeredService', 'registeredService')
      .leftJoinAndSelect('q.sentToTaxBy', 'sentToTaxBy')

      .where(queryWhere);

    if (params['end']) {
      query.andWhere({
        submitAt: LessThan(
          moment(`${params['end']} 00:00`, AppConstant.SUBMIT_TIME_FORMAT)
            .add(1, 'day')
            .toDate()
        )
      });
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

    console.log('isSingle', value?.isSingle);

    if (!value?.isSingle) {
      query.andWhere('q.reception=:reception', { reception: true });
    }

    let [content] = await query
      // .addGroupBy('q.items.product')
      // .offset(params?.offset || 0)
      // .limit(params?.limit || 10)
      .getManyAndCount();
    const result = [];

    if (!value?.isSingle) {
      for (let index = 0; index < content.length; index++) {
        const element = content[index];
        const saleItems = await SaleItem.find({
          where: [
            {
              saleOrder: { id: element.id }
            },
            {
              saleOrder: { receptionSaleOrder: { id: element.id } }
            }
          ],
          relations: {
            saleOrder: { receptionSaleOrder: true },
            product: true,
            contractor: true,
            user: true
          },
          order: {
            submitAt: 1
          }
        });
        element.items = [...element.items, ...saleItems];
        element.items = element.items.filter(
          (item, index, self) =>
            index === self.findIndex((t) => t.id === item.id)
        );
        element.discount = element.items
          .filter((item) => !item.deletedAt && !item.parentId && !item.parent)
          ?.map((item) => item.discount || 0)
          .reduce((a, b) => (a || 0) + (b || 0), 0);
        element.tax = element.items
          ?.filter((item) => !item.deletedAt && !item.parentId && !item.parent)
          ?.map((item) => item.taxAmount || 0)
          .reduce((a, b) => (a || 0) + (b || 0), 0);
        element.totalAmount = element.items
          ?.filter((item) => !item.deletedAt && !item.parentId && !item.parent)
          ?.map((item) => item.totalAmount || 0)
          .reduce((a, b) => (a || 0) + (b || 0), 0);

        result.push({
          ...element,
          orderIds: new Set([
            ...element.items.map((e: any) => e?.saleOrderId || e?.saleOrder?.id)
          ])
        });
      }
    } else {
      result.push(
        ...content.map((element) => ({
          ...element,
          orderIds: new Set([...element.items.map((e) => e.saleOrderId)])
        }))
      );
    }

    return result;
  }

  async getLastDate() {
    try {
      const { pakokToken } = await Setting.findByKey(SettingKey.SendToTax);
      const res = await firstValueFrom(
        this.httpService.post(
          `${this.configService.get('PAKOK_BASE_URL')}/GetLastSentInvoice`,
          {},
          { headers: { Authorization: `Bearer ${pakokToken.trim()}` } }
        )
      );
      console.log(res?.data?.result?.invoiceDate);
      return { date: res?.data?.result?.invoiceDate || undefined };
    } catch (error) {
      console.log(error);
    }
  }

  prepareLockerLocationItems(order: SaleOrder, saleUnit: SaleUnit) {
    const items = order.items.filter(
      (e) =>
        !e.deletedAt &&
        e.quantity > 0 &&
        e.product.needLocker !== NeedLockerType.No
    );
    const values: LockerLocationDto[] = Object.values(
      items.reduce((acc, curr) => {
        if (
          curr.product.lockerLocation?.id === undefined ||
          curr.product.needLocker === NeedLockerType.Unknown
        ) {
          curr.product.lockerLocation = {
            id: saleUnit?.lockerLocation?.id || 0
          } as any;
        }
        if (acc[curr.product.lockerLocation?.id]) {
          acc[curr.product.lockerLocation?.id].quantity += curr.persons;
        } else {
          acc[curr.product.lockerLocation?.id] = {
            lockerLocation: curr.product.lockerLocation?.id,
            quantity: curr.quantity > 0 ? curr.persons : 0
          };
        }
        return acc;
      }, {})
    );

    if (order?.id && order?.vipLocker && values && values.length > 0) {
      const index = values.findIndex(
        (el) => el.lockerLocation === order.vipLocker.locker.lockerLocationId
      );
      if (index > -1) values[index].quantity -= 1;
      else values[0].quantity -= 1;
    }
    return values.sort((a: any, b: any) =>
      a.lockerLocation > b.lockerLocation ? -1 : 1
    );
  }

  upDateLockerLocationItemVip(
    saleUnit: SaleUnit,
    lockerLocationItems: LockerLocationDto[],
    vipLokcer: LockerItem
  ) {
    if (
      !saleUnit.autoAssign ||
      !lockerLocationItems ||
      lockerLocationItems.length === 0
    )
      return [];
    const index = lockerLocationItems.findIndex(
      (el) => +el.lockerLocation === +vipLokcer?.locker?.lockerLocationId
    );
    if (index > -1) lockerLocationItems[index].quantity -= 1;
    else
      lockerLocationItems.sort((a, b) =>
        a.lockerLocation - b.lockerLocation > 0 ? 1 : -1
      )[0].quantity -= 1;
    return lockerLocationItems;
  }

  async penaltyApply(id: number, current: User, isDevice: boolean = false) {
    let notification_unfair_Logout = false;
    console.log('penaltyApply');
    const order = await SaleOrder.findOne({
      where: { id: id },
      relations: {
        items: { product: true, registeredService: true },
        lockers: true,
        saleUnit: true,
        user: true,
        organizationUnit: true
      }
    });
    if (!order) throw new BadRequestException('invalid id');
    const saleItems = await SaleItem.find({
      where: {
        saleOrder: { id: id, reception: true },
        type: SaleUnitType.Reception,
        product: {
          unfairUseAmount: MoreThan(0),
          fairUseTime: MoreThan(0)
        }
      },
      relations: {
        saleOrder: true,
        product: { priceList: true },
        registeredService: true
      }
    });

    console.log(
      'saleItemssss',
      saleItems.map((e) => ({
        quantity: e.quantity,
        unFairPenaltyQuantity: e.unFairPenaltyQuantity
      }))
    );

    const penalty_saleItems = await this.findUnFairSaleItems(saleItems);

    console.log('penalty_saleItems', penalty_saleItems.length);

    if (penalty_saleItems.length === 0) return [undefined, false];

    const dto = {
      id: order.id,
      freeReception: false,
      organizationUnit: order.organizationUnit.id,
      saleUnit: order.saleUnit.id,
      submitAt: moment().format(AppConstant.SUBMIT_TIME_FORMAT),
      user: order.user.id,
      transactions: [],
      lockers: order.lockers.map((e) => e.locker),
      lockerQuantity: order.lockers.length,
      items: [
        ...order.items.map((el) => ({
          id: el.id,
          contractor: el.contractorId,
          product: el.product.id,
          duration: el.duration,
          quantity: el.quantity,
          persons: el.persons,
          discount: el.discount,
          price: el.price,
          tax: el.tax,
          amount: el.amount,
          manualPrice: el.manualPrice,
          type: el.type,
          registeredService: el?.registeredServiceId,
          groupClassRoom: el.groupClassRoomId,
          end: el.end,
          priceId: el.priceId,
          description: el.description,
          unFairPenaltyQuantity: el.unFairPenaltyQuantity
        }))
      ]
    };

    for (let index = 0; index < penalty_saleItems.length; index++) {
      const element = penalty_saleItems[index];
      console.log(
        '66666666666666666666666',
        saleItems
          .filter((e) => e.product.id === element.product.id)
          .map((e) => e.unFairPenaltyQuantity)
      );

      const unfairPenaltyAmount = saleItems
        .filter((e) => e.product.id === element.product.id)
        .reduce((pre, curr) => {
          pre += curr.unFairPenaltyQuantity;
          return pre;
        }, 0);

      const unfairUseTotalAmount = this.calculateUnFairAmount(
        element,
        unfairPenaltyAmount
      );

      console.log('unfairUseTotalAmount', unfairUseTotalAmount);
      console.log('unfairPenaltyAmount', unfairPenaltyAmount);

      if (
        element.registeredService &&
        element.registeredService.credit -
          element.registeredService.usedCredit <
          unfairUseTotalAmount &&
        !element?.product?.priceList?.find((el) => el?.min === 1)
      ) {
        throw new BadRequestException(
          'The product containing the penalty must have a single session'
        );
      }

      if (
        element.registeredService &&
        element.registeredService.credit -
          element.registeredService.usedCredit <
          unfairUseTotalAmount &&
        isDevice
      ) {
        console.log('notification_unfair_Logout', notification_unfair_Logout);
        notification_unfair_Logout = true;
      }

      console.log(
        'unfairUseTotalAmount',
        unfairUseTotalAmount,
        !!element.registeredService,
        element.id
      );

      if (element.registeredService) {
        const remain_credit =
          element.registeredService.credit -
          element.registeredService.usedCredit;
        console.log('remain_credit', remain_credit);
        if (
          remain_credit < unfairUseTotalAmount &&
          element.product.priceList.find((el) => el.min === 1) &&
          remain_credit != 0
        ) {
          console.log(11111111111111111111111111);
          console.log(1);
          dto.items.find((el) => el.id === element.id).quantity +=
            remain_credit;
          (
            dto.items.find((el) => el.id === element.id) as any
          ).unFairPenaltyQuantity += remain_credit;

          dto.items.push({
            product: element?.product?.id as any,
            duration: element.duration,
            quantity: unfairUseTotalAmount - remain_credit,
            persons: 1,
            discount: 0,
            price: element.product?.priceList.find((el) => el?.min === 1)?.price || element.product?.price,
            priceId:element.product?.priceList.find((el) => el?.min === 1)?.id,
            tax: 0,
            amount: element.product?.priceList.find((el) => el?.min === 1)?.price || element.product?.price,
            manualPrice: false,
            type: SaleUnitType.Reception,
            registeredService: 0 as any,
            unFairPenaltyQuantity: unfairUseTotalAmount - remain_credit,
            end: moment().format(AppConstant.DATE_FORMAT) as any,
            isFree: false,
            description: null,
            contractor: dto.items.find((el) => el.id === element.id).contractor
          } as any);
        } else if (remain_credit >= unfairUseTotalAmount) {
          console.log(2);

          dto.items.find((el) => el.id === element.id).quantity =
            unfairUseTotalAmount + element.quantity;
          (
            dto.items.find((el) => el.id === element.id) as any
          ).unFairPenaltyQuantity =
            element.unFairPenaltyQuantity + unfairUseTotalAmount;
        } else if (
          remain_credit === 0 &&
          !saleItems.find(
            (e) =>
              e.productId === element.productId &&
              !e.registeredService &&
              e.quantity - e.unFairPenaltyQuantity === 0
          )
        ) {
          console.log(3);

          dto.items.push({
            product: element?.product?.id as any,
            duration: element.duration,
            quantity: unfairUseTotalAmount,
            persons: 1,
            discount: 0,
            price: element.product?.priceList.find((el) => el?.min === 1)?.price || element.product?.price,
            priceId:element.product?.priceList.find((el) => el?.min === 1)?.id,
            tax: 0,
            amount: element.product?.priceList.find((el) => el?.min === 1)?.price || element.product?.price,
            manualPrice: false,
            type: SaleUnitType.Reception,
            registeredService: 0 as any,
            unFairPenaltyQuantity: unfairUseTotalAmount,
            end: moment().format(AppConstant.DATE_FORMAT) as any,
            isFree: false,
            description: null,
            contractor: dto.items.find((el) => el.id === element.id).contractor
          } as any);
        } else if (
          remain_credit === 0 &&
          saleItems.find(
            (e) =>
              e.productId === element.productId &&
              !e.registeredService &&
              e.quantity - e.unFairPenaltyQuantity === 0
          )
        ) {
          console.log(4);

          const id = saleItems.find(
            (e) =>
              e.productId === element.productId &&
              !e.registeredService &&
              e.quantity - e.unFairPenaltyQuantity === 0
          ).id;

          dto.items.find((el) => el.id === id).quantity +=
            +unfairUseTotalAmount || 0;
          (dto.items.find((el) => el.id === id) as any).unFairPenaltyQuantity +=
            +unfairUseTotalAmount || 0;
        }
      } else {
        console.log('called2182', unfairUseTotalAmount);
        dto.items.find((el) => el.id === element.id).quantity +=
          unfairUseTotalAmount;
        (
          dto.items.find((el) => el.id === element.id) as any
        ).unFairPenaltyQuantity =
          element.unFairPenaltyQuantity + unfairUseTotalAmount;

        console.log(
          'change value',
          (dto.items.find((el) => el.id === element.id) as any)
            .unFairPenaltyQuantity
        );
      }
    }

    console.log('dto-----------------------------2227', dto);

    let answer;
    await this.submit(dto as any, current, (order) => {
      answer = order;
    });

    return [answer, notification_unfair_Logout];
  }

  async findUnFairSaleItems(saleItems: SaleItem[]) {
    const penalty_saleItems = saleItems
      .filter(
        (e) =>
          e.quantity - e.unFairPenaltyQuantity > 0 &&
          e.product.unfairUseAmount > 0 &&
          e.product.fairUseTime > 0
      ) //ایتم هایی که تمام جریمه حساب نشه
      .filter((el) => {
        const unFairPenaltyQuantityTotal = saleItems
          .filter((e) => e.product.id === el.product.id)
          .reduce((pre, curr) => {
            pre += curr.unFairPenaltyQuantity;
            return pre;
          }, 0);

        const unfairAmount = this.calculateUnFairAmount(
          el,
          unFairPenaltyQuantityTotal
        );
        return unfairAmount > 0;
      });

    return penalty_saleItems;
  }

  calculateUnFairAmount(item: SaleItem, unFairPenaltyQuantity: number) {
    const diff_minutes = moment(
      moment().format(AppConstant.SUBMIT_TIME_FORMAT)
    ).diff(
      moment(moment(item.createdAt).format(AppConstant.SUBMIT_TIME_FORMAT)),
      'minutes'
    );

    console.log(
      'diff_minutes',
      item.createdAt,
      diff_minutes,
      item.product.fairUseTime *
        ((item.quantity - item.unFairPenaltyQuantity) / item.persons)
    );

    const penalty_time =
      diff_minutes -
      item.product.fairUseTime *
        ((item.quantity - item.unFairPenaltyQuantity) / item.persons);

    const penaltyCount =
      Math.floor(penalty_time / item.product.fairUseTime) * item.persons;

    console.log(
      'penaltyCount',
      penaltyCount,
      penalty_time,
      penalty_time - penaltyCount * item.product.fairUseTime,
      item.product.fairUseLimitTime
    );

    const extraTime =
      penalty_time - penaltyCount * item.product.fairUseTime >
      item.product.fairUseLimitTime
        ? 1 * item.persons
        : 0;

    console.log(
      'unFairLimit',
      penaltyCount + extraTime - unFairPenaltyQuantity,
      penaltyCount,
      extraTime,
      item.unFairPenaltyQuantity,
      unFairPenaltyQuantity
    );
    return penaltyCount + extraTime - unFairPenaltyQuantity;
  }
}
