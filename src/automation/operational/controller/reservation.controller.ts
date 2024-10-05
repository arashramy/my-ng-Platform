import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { Product } from '../../../automation/base/entities/Product';
import moment, { now } from 'moment';
import { ReserveTag } from '../../../automation/base/entities/ReserveTag';
import jalalyMoment from 'moment-jalaali';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { AccessTokenGuard } from '../../../auth/guard/access-token.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../base/entities/User';
import { SaleOrderService } from '../service/sale-order.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PreReserveDTO } from '../dto/pre-reserve.dto';
import { EventsConstant } from '../../../common/constant/events.constant';
import { SseService } from '../../../common/sse/sse.service';
import { RegisteredServiceStatus, SaleItem } from '../entities/SaleItem';
import { CancelReservationDTO } from '../dto/cancel-reservation.dto';
import { SaleOrder } from '../entities/SaleOrder';
import { TransactionService } from '../service/transaction.service';
import { Transaction, TransactionType } from '../entities/Transaction';
import { TransactionSourceType } from '../../../base/entities/TransactionSource';
import { FiscalYear } from '../../../base/entities/FiscalYears';
import { OrganizationUnit } from '../../../base/entities/OrganizationUnit';
import { ShiftWorkService } from '../../../base/service/shift-work.service';
import { ShiftWork } from '../../../base/entities/ShiftWork';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SmsReserveService } from '../../../sms/sms-reserve.service';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';
import { SaleUnit } from '../../../base/entities/SaleUnit';


@UseGuards(AccessTokenGuard)
@Controller('/api/reservation')
export class ReservationController {
  @Inject(SaleOrderService) private readonly saleOrderService: SaleOrderService;
  @Inject(EventEmitter2) eventEmitter: EventEmitter2;
  @Inject(SseService) private readonly sseService: SseService;
  @Inject(TransactionService)
  private readonly transactionService: TransactionService;
  @Inject(SmsReserveService)
  private readonly smsReserveService: SmsReserveService;

  @Inject(DataSource) private readonly datasource: DataSource;
  @Inject(ShiftWorkService) private readonly shiftworkService: ShiftWorkService;

  constructor(@InjectQueue('reserve-order') public reserveOrderQueue: Queue) {}

  @Get('/items/:tagId')
  async getReserveViewByTagId(
    @Param('tagId', ParseIntPipe) tagId: number,
    @Query('patternId') patternId: number,
    @Query('gender') gender: any,
    @Query('weekNumber') week: number,
    @Query('monthNumber') monthNumber: number,
    @Query('date') specefiedDateQuery: string,
    @Query('saleUnit') saleUnit: number,
    @Query('day') day: string
  ) {
    const speceficTimes = [];
    const services = (
      await Product.find({
        where: {
          ...(saleUnit
            ? { authorizedSalesUnits: [{ id: saleUnit }, { id: IsNull() }] }
            : {}),
          reservable: true,
          related: false,
          reservationPattern: {
            reservationTag: {
              id: +tagId
            },
            ...(patternId ? { id: patternId } : {})
          }
        },
        relations: {
          reservationPattern: { reservationTag: true },
          subProducts: { price: true, product: true }
        }
      })
    ).map((e) => {
      return {
        ...e,
        reservationPattern: {
          ...e.reservationPattern,
          items: e.reservationPattern.items.filter((e) => {
            if (e.fromDate && e.toDate) {
              speceficTimes.push(e);
            }
            return !e.fromDate && !e.toDate;
          })
        }
      };

      // reserve: {
      //   ...e.reserve,
      //   pattern: {
      //     ...e.reserve.pattern,
      //     items: e.reserve.pattern.items.filter((e) => {
      //       if (e.fromDate && e.toDate) {
      //         speceficTimes.push(e);
      //       }
      //       return !e.fromDate && !e.toDate;
      //     })
      //   }
      // }
      //   };
    });

    const tag = await ReserveTag.findOne({ where: { id: tagId } });
    if (!tag) {
      throw new NotFoundException('tag is not defined');
    }
    const items = [];

    while (true) {
      const lastItem = items.at(-1);
      if (lastItem?.end === tag.endTime) break;

      let newItem;
      if (!lastItem) {
        newItem = {
          start: tag.startTime,
          end: moment(tag.startTime, 'HH:mm')
            .add(tag.duration, tag.unit as any)
            .format('HH:mm')
        };
      } else {
        newItem = {
          start: lastItem.end,
          end: moment(lastItem.end, 'HH:mm')
            .add(tag.duration, tag.unit as any)
            .format('HH:mm')
        };
      }
      items.push(newItem);
    }

    let x = [
      {
        name: 'day6',
        items: []
      },
      {
        name: 'day7',
        items: []
      },
      {
        name: 'day1',
        items: []
      },
      {
        name: 'day2',
        items: []
      },
      {
        name: 'day3',
        items: []
      },
      {
        name: 'day4',
        items: []
      },
      {
        name: 'day5',
        items: []
      }
    ];

    const reservableRegisteredService = await SaleItem.find({
      where: {
        isReserve: true,
        canceledBy: IsNull(),
        canceledDate: IsNull(),
        isCanceled: false,
        product: {
          related: false,
          reservationPattern: {
            reservationTag: {
              id: tagId
            }
          }
        },
        // status: RegisteredServiceStatus.opened,
        deletedAt: IsNull()
      },
      relations: {
        user: true,
        product: true
      }
    });
    for (let i = 1; i <= 7; i++) {
      services.map((e2) => {
        e2.reservationPattern?.items.map((e) => {
          if (e?.[`day${i}`]) {
            const index = x.findIndex((e1) => e1.name === `day${i}`);
            if (index >= 0) {
              if (!x[index]?.items?.find((e) => e.id === e2.id)) {
                x[index]?.items?.push({ ...e2, reservePrice: e.price });
              }
            } else {
              x.push({
                name: `day${i}`,
                items: [{ ...e2, reservePrice: e.price }]
              });
            }
          }
        });
      });
    }

    const ppp = {};
    items.map((item) => {
      const xxx = x
        .map((y) => {
          const f2 = y.items.filter(
            (y2: Product) =>
              !!y2.reservationPattern.items.find((y3) => {
                return (
                  y3.fromTime === item.start &&
                  y3.toTime === item.end &&
                  y3?.[y.name] &&
                  (gender ? y3.gender === gender : true) &&
                  y3.isActive
                );
              })
          );

          if (day && typeof monthNumber !== typeof undefined) {
            if (y.name !== day) {
              return undefined;
            }
          }
          if (f2.length > 0) {
            return { name: y.name, items: y.items };
          }
          return { name: y.name, items: [] };
        })
        .filter((e) => e);
      if (!ppp[`${item.start}_${item.end}`])
        ppp[`${item.start}_${item.end}`] = [];

      ppp[`${item.start}_${item.end}`] = [
        ...ppp[`${item.start}_${item.end}`],
        ...xxx
      ];
    });

    if (
      typeof week !== typeof undefined &&
      typeof specefiedDateQuery === typeof undefined
    ) {
      let date;
      if (week === 0) {
        date = moment(now()).startOf('week').subtract(1).format('YYYY/MM/DD');
        if (moment().weekday(6).isSame(moment())) {
          date = moment(now()).endOf('week').subtract(1).format('YYYY/MM/DD');
        }
      } else if (week >= 1) {
        date = moment()
          .add(+week, 'week')
          .startOf('week')
          .subtract(1)
          .format('YYYY/MM/DD');

        if (moment().weekday(6).isSame(moment())) {
          date = moment()
            .add(+week, 'week')
            .endOf('week')
            .subtract(1)
            .format('YYYY/MM/DD');
        }
      } else {
        date = moment()
          .subtract(week * -1, 'week')
          .startOf('week')
          .subtract(1)
          .format('YYYY/MM/DD');
        if (moment().weekday(6).isSame(moment())) {
          date = moment()
            .subtract(week * -1, 'week')
            .endOf('week')
            .subtract(1)
            .format('YYYY/MM/DD');
        }
      }

      Object.keys(ppp).map((e) => {
        if (ppp[e]?.items?.length === 0) {
          return;
        }

        if (ppp?.[e]?.[0]) {
          ppp[e] = ppp?.[e]?.map((e, i) => {
            if (i !== 0) {
              date = moment(date, 'YYYY/MM/DD')
                .add(1, 'day')
                .format('YYYY/MM/DD');
            }

            const newData = {
              ...e,
              date: date
            };

            if (e.name === 'day5') {
              date = moment()
                .add(+week, 'week')
                .startOf('week')
                .subtract(1)
                .format('YYYY/MM/DD');

              if (moment().weekday(6).isSame(moment())) {
                date = moment()
                  .add(+week, 'week')
                  .endOf('week')
                  .subtract(1)
                  .format('YYYY/MM/DD');
              }
            }

            return newData;
          });
        }
      });
    }

    if (
      day &&
      typeof monthNumber !== typeof undefined &&
      typeof specefiedDateQuery === typeof undefined
    ) {
      Object.keys(ppp).map((e) => {
        if (ppp[e]?.items?.length === 0) {
          return;
        }

        if (ppp?.[e]?.[0]) {
          const dates = [];

          const weekDay = day.split('day').at(-1);

          for (let i = 0; i <= 4; i++) {
            let newDay = jalalyMoment()
              .startOf('jMonth')
              .weekday(+weekDay)
              .add(i, 'week')
              .format('YYYY/MM/DD');

            if (monthNumber < 0) {
              newDay = jalalyMoment()
                .subtract(monthNumber * -1, 'jMonth')
                .startOf('jMonth')
                .weekday(+weekDay)
                .add(i, 'week')
                .format('YYYY/MM/DD');
            } else if (monthNumber > 0) {
              newDay = jalalyMoment()
                .add(monthNumber, 'jMonth')
                .startOf('jMonth')
                .weekday(+weekDay)
                .add(i, 'week')
                .format('YYYY/MM/DD');
            }
            let endOfCurrentMonth = jalalyMoment().endOf('jMonth');
            let startOfCurrentMonth = jalalyMoment().startOf('jMonth');

            if (monthNumber > 0) {
              endOfCurrentMonth = jalalyMoment()
                .add(monthNumber, 'jMonth')
                .endOf('jMonth');
              startOfCurrentMonth = jalalyMoment()
                .add(monthNumber, 'jMonth')
                .startOf('jMonth');
            } else if (monthNumber < 0) {
              endOfCurrentMonth = jalalyMoment()
                .subtract(monthNumber * -1, 'jMonth')
                .endOf('jMonth');
              startOfCurrentMonth = jalalyMoment()
                .subtract(monthNumber * -1, 'jMonth')
                .endOf('jMonth');
            }
            if (
              !endOfCurrentMonth.isSameOrBefore(newDay) &&
              moment(newDay, 'YYYY/MM/DD').isSameOrAfter(startOfCurrentMonth)
            ) {
              dates.push(newDay);
            }
          }
          const item = { ...ppp?.[e]?.[0] };
          delete ppp?.[e]?.[0];
          for (let i = 0; i < dates.length; i++) {
            ppp?.[e]?.push({
              ...item,
              date: dates[i]
            });
          }
        }
      });
    }

    if (typeof specefiedDateQuery !== typeof undefined) {
      Object.keys(ppp).map((e) => {
        if (ppp[e]?.items?.length === 0) {
          return;
        }

        if (ppp?.[e]?.[0]) {
          ppp[e] = ppp?.[e]
            ?.filter(
              (element) =>
                element.name === `day${moment(specefiedDateQuery).isoWeekday()}`
            )
            ?.map((e, i) => {
              const newData = {
                ...e,
                date: specefiedDateQuery
              };
              return newData;
            });
        }
      });
    }

    const x123 = {};
    Object.keys(ppp).map((pp: any) => {
      x123[pp] = ppp?.[pp]?.map((p) => {
        // console.log(123,p)
        const items = [];
        p.items.map((p2) => {
          const date = p.date;
          const startTime = pp.split('_').at(0);
          const endTime = pp.split('_').at(1);
          // items.push({ ...p2, isReserve: false });
          const isReservedBefore = reservableRegisteredService.filter((e) => {
            return (
              e.reservedEndTime === endTime &&
              e.reservedStartTime === startTime &&
              moment(e.reservedDate, 'YYYY/MM/DD').format('YYYY/MM/DD') === date
            );
          });
          if (isReservedBefore.length === 0) {
            items.push({ ...p2, isReserve: false });
          } else {
            isReservedBefore.map((x) => {
              if (!x || p2?.id !== x?.product?.id) {
                if (items.filter((x) => x.id === p2.id).length === 0) {
                  items.push({ ...p2, isReserve: false });
                }
              } else {
                const index = items.findIndex((x) => x.id === p2.id);
                if (index > -1) items.splice(index, 1);
                // console.log(x.id);
                items.push({
                  ...p2,
                  isReserve: true,
                  user: x?.user,
                  registeredId: x.id
                });
              }
            });
          }
        });
        return {
          ...p,
          items
        };
      });
    });

    let result = {};
    Object.keys(x123).map((pp: any) => {
      result[pp] = x123?.[pp]?.map((p) => {
        return {
          ...p,
          items: p.items.map((p2) => {
            const date = p.date;
            const speceficTime = speceficTimes.find((e12) => {
              return (
                e12.fromDate &&
                e12.toDate &&
                moment(date, 'YYYY/MM/DD').isBetween(
                  moment(e12.fromDate, 'YYYY/MM/DD').subtract(1, 'day'),
                  moment(e12.toDate, 'YYYY/MM/DD').add(1, 'day')
                )
              );
            });
            if (speceficTime) {
              const index = p2.reserve.pattern.items.findIndex((e) => {
                return (
                  e.fromTime === speceficTime.fromTime &&
                  e.toTime === speceficTime.toTime
                );
              });

              if (p2.reserve.pattern.items[index]?.isActive) {
                p2.reserve.pattern.items[index] = Object.assign(
                  p2.reserve.pattern.items[index],
                  {
                    ...p2.reserve.pattern.items[index],
                    ...speceficTime
                  }
                );
              } else {
                p2.reserve.pattern.items.splice(index, 1);
              }
            }

            return p2;
          })
        };
      });
    });

    // Object.values({ ...result }).map((e: any) =>
    //   e.map((y) =>
    //     console.log(y.items.map((e) => `${e.isReserve}_${e.registeredId}`))
    //   )
    // );
    return result;
  }

  @UseGuards(AccessTokenGuard)
  @Post()
  async submitReserveFactor(@CurrentUser() user: User, @Body() body: any) {
    const chunkCount = Math.ceil(body.items.length / 3);
    for (let i = 0; i < chunkCount; i++) {
      const chunk = body.items.splice(0, 3);
      for (let j = 0; j < chunk.length; j++) {
        const item = chunk?.[j];
        this.reserveOrderQueue.add({
          masterOrderPayload: {
            isReserve: true,
            user: item.user,
            saleUnit: body.saleUnit,
            fiscalYear: body.fiscalYear,
            organizationUnit: body.organizationUnit,
            transactions: item.transactions,
            freeReception: true,
            description: (body?.description || '') + ' - ' + item.description,
            items: [
              {
                ...item,
                credit: 1,
                isReserve: true,
                type: SaleUnitType.Service,
                amount: item.price,
                manualPrice: false,
                price: item.price,
                quantity: 1,
                description:
                  (body?.description || '') + ' - ' + item.description
              }
            ]
          },
          user,
          item
        });
      }
    }

    return true;
  }

  @Post('/pre-reserve')
  async getSSeData(@Body() body: PreReserveDTO) {
    const product = await Product.findOne({
      where: { id: body.product, reservable: true },
      relations: { reservationPattern: true }
    });
    if (!product) {
      throw new NotFoundException('This Product Is Not Defined');
    }

    if (!product.reservationPattern?.items?.length) {
      throw new NotFoundException(
        'This Product Must Configure For Reservation'
      );
    }

    const item = product.reservationPattern.items.find((element) => {
      return (
        element?.[body.day] &&
        element.fromTime === body.fromTime &&
        element.toTime === body.toTime &&
        ((element.gender as any) === 'Both' || element.gender === body.gender)
      );
    });

    if (!item) {
      throw new NotFoundException('This Product not related to this config');
    }

    const specificDate = product.reservationPattern.items.find(
      (element) =>
        moment(body.specificDate, 'YYYY/MM/DD').isBetween(
          element.fromDate,
          element.toDate
        ) &&
        element.fromTime === body.fromTime &&
        element.toTime === body.toTime &&
        ((element.gender as any) === 'Both' || element.gender === body.gender)
    );

    this.eventEmitter.emit(EventsConstant.CLIENT_REMOTE, {
      data: { ...body, product, price: specificDate?.price || item?.price },
      key: 'PRE_RESERVE'
    });

    return { price: specificDate?.price || item?.price };
  }

  @Post('/calculate-price')
  async calculatePrice(@Body() body: PreReserveDTO) {
    const product = await Product.findOne({
      where: { id: body.product, reservable: true },
      relations: { reservationPattern: true }
    });
    if (!product) {
      throw new NotFoundException('This Product Is Not Defined');
    }

    if (!product.reservationPattern?.items?.length) {
      throw new NotFoundException(
        'This Product Must Configure For Reservation'
      );
    }

    const item = product.reservationPattern.items.find((element) => {
      return (
        element?.[body.day] &&
        element.fromTime === body.fromTime &&
        element.toTime === body.toTime &&
        ((element.gender as any) === 'Both' || element.gender === body.gender)
      );
    });

    if (!item) {
      throw new NotFoundException('This Product not related to this config');
    }

    const specificDate = product.reservationPattern.items.find(
      (element) =>
        moment(body.specificDate, 'YYYY/MM/DD').isBetween(
          element.fromDate,
          element.toDate
        ) &&
        element.fromTime === body.fromTime &&
        element.toTime === body.toTime &&
        ((element.gender as any) === 'Both' || element.gender === body.gender)
    );

    return {
      price: specificDate?.price || item?.price,
      tax: specificDate?.tax || item?.tax || null
    };
  }

  @Post('/cancel')
  async cancelReservation(
    @Body() body: CancelReservationDTO,
    @CurrentUser() user: User
  ) {
    const submitAt = new Date();
    const saleUnit = await SaleUnit.findOne({ where: { id: body.saleUnit } });
    if (!saleUnit) {
      throw new NotFoundException('sale unit is not defined');
    }
    const fiscalYear = await FiscalYear.findOne({
      where: { id: body.fiscalYear }
    });
    if (!fiscalYear) {
      throw new NotFoundException('fiscal year is not defined');
    }
    const organizationUnit = await OrganizationUnit.findOne({
      where: { id: body.organizationUnit }
    });
    if (!organizationUnit) {
      throw new NotFoundException('organization unit is not defined');
    }
    const shiftwork = await this.shiftworkService.findBy(
      submitAt,
      body.organizationUnit
    );
    if (!shiftwork) {
      throw new NotFoundException('shift work is not defined');
    }
    const saleOrder = await SaleOrder.findOne({
      where: { id: body.id },
      relations: {
        subProductOrders:
          typeof body.penaltyAmount !== typeof undefined
            ? { items: true, transactions: true, user: true }
            : false,
        items: { product: true },
        transactions: true,
        user: true
      }
    });

    if (!saleOrder) {
      throw new NotFoundException('sale order is not defined');
    }

    saleOrder.isCanceled = true;
    saleOrder.canceledBy = user;
    saleOrder.canceledDate = new Date();
    await saleOrder.save();

    for (let i = 0; i < saleOrder.items.length; i++) {
      await SaleItem.update(
        { id: saleOrder?.items?.[i]?.id },
        {
          canceledBy: user,
          canceledDate: new Date(),
          isCanceled: true
        }
      );
    }

    if (typeof body.penaltyAmount !== typeof undefined) {
      for (let i = 0; i < saleOrder.subProductOrders.length; i++) {
        const subProductSaleOrder = saleOrder?.subProductOrders?.[i];
        if (subProductSaleOrder.isCanceled) continue;
        subProductSaleOrder.isCanceled = true;
        subProductSaleOrder.canceledBy = user;
        subProductSaleOrder.canceledDate = new Date();
        await subProductSaleOrder.save();

        for (let i = 0; i < subProductSaleOrder.items.length; i++) {
          await SaleItem.update(
            { id: subProductSaleOrder?.items?.[i]?.id },
            {
              canceledBy: user,
              canceledDate: new Date(),
              isCanceled: true
            }
          );

          this.returnReserveAmountTransaction(
            subProductSaleOrder.transactions.reduce(
              (acc, item) => acc + +item.amount,
              0
            ),
            saleOrder.user,
            fiscalYear,
            shiftwork,
            organizationUnit,
            saleUnit,
            submitAt
          );
        }
      }
    }

    this.returnReserveAmountTransaction(
      saleOrder.transactions.reduce((acc, item) => acc + +item.amount, 0),
      saleOrder.user,
      fiscalYear,
      shiftwork,
      organizationUnit,
      saleUnit,
      submitAt
    ).then(async (xxx) => {
      if (typeof body.penaltyAmount !== typeof undefined) {
        this.createPenaltyTransaction(
          saleOrder.user,
          shiftwork,
          organizationUnit,
          fiscalYear,
          saleUnit,
          user,
          body.penaltyAmount
        );
      }
    });

    if (typeof body.penaltyAmount !== typeof undefined) {
      // send sms
      this.smsReserveService.sendCancelReserve({
        item: saleOrder.items[0],
        user: saleOrder.user,
        penaltyAmount: body.penaltyAmount
      });
    }
  }

  async createPenaltyTransaction(
    user: User,
    shift: ShiftWork,
    organizationUnit: OrganizationUnit,
    fiscalYear: FiscalYear,
    saleUnit: SaleUnit,
    current: User,
    penaltyAmount: number
  ) {
    if (penaltyAmount === 0) return;
    return this.datasource.manager.transaction(async (manager) => {
      let trx = new Transaction();
      trx.type = TransactionType.Withdraw;
      trx.sourceType = TransactionSourceType.Reserve;
      trx.user = await User.findOne({ where: { id: user.id } });
      trx.shiftWork = shift;
      trx.organizationUnit = organizationUnit;
      trx.fiscalYear = fiscalYear;
      trx.saleUnit = saleUnit;
      trx.submitAt = new Date();
      trx.createdBy = current;
      trx.amount = penaltyAmount;
      trx.title = TransactionType[TransactionType.Withdraw];
      trx.credit = trx.user.credit - penaltyAmount;
      trx = await this.transactionService.doTransaction(trx, false, manager);
      trx = await manager.save(trx);
      return trx;
    });
  }

  async returnReserveAmountTransaction(
    initialAmount: number,
    user: User,
    fiscalYear: FiscalYear,
    shiftwork: ShiftWork,
    organizationUnit: OrganizationUnit,
    saleUnit: SaleUnit,
    submitAt: Date
  ) {
    return this.datasource.manager.transaction(async (manager) => {
      let transaction: Transaction = new Transaction();
      const amount = initialAmount * -1;
      transaction.type = TransactionType.Deposit;
      transaction.saleUnit = saleUnit;
      transaction.fiscalYear = fiscalYear;
      transaction.organizationUnit = organizationUnit;
      try {
        transaction.user = await manager.findOneOrFail(User, {
          where: { id: user.id },
          cache: true
        });
      } catch (e) {
        throw new BadRequestException('User not found');
      }
      transaction.submitAt = submitAt;
      transaction.sourceType = TransactionSourceType.Reserve;
      transaction.shiftWork = shiftwork;
      transaction.amount = amount;
      transaction.createdBy = user;
      transaction.title = TransactionType[TransactionType.Deposit];
      transaction = await this.transactionService.doTransaction(
        transaction,
        true,
        manager
      );
      transaction.credit = transaction.user.credit;
      transaction.amount = transaction.amount * -1;
      transaction = await manager.save(transaction);
      return transaction;
    });
  }
}
