import { BadRequestException, Injectable } from '@nestjs/common';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import {
  LockerItem,
  Lockerstate,
  LockerStatus,
  LockerType
} from '../../operational/entities/LockerItem';
import { In, IsNull, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import { ReceptionLocker } from '../../operational/entities/ReceptionLocker';
import {
  RegisteredServiceStatus,
  SaleItem
} from '../../operational/entities/SaleItem';
import { User } from '../../../base/entities/User';
import moment, { now } from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { SaleOrder } from '../../operational/entities/SaleOrder';
import { Locker } from '../entities/Locker';
import { LockerLocationDto } from '../dto/lockes.dto';

@Injectable()
export class LockerService {
  async assign(
    saleUnit: SaleUnit,
    quantity?: number,
    lockers?: any[],
    oldLockers?: ReceptionLocker[],
    lockerLocationItems?: any[],
    mustAssignAutomaticly?: boolean
  ) {
    let out = [];
    if (
      (!saleUnit.autoAssign &&
        typeof mustAssignAutomaticly !== typeof undefined &&
        !mustAssignAutomaticly) ||
      (!saleUnit.autoAssign &&
        typeof mustAssignAutomaticly === typeof undefined)
    ) {
      if (lockers && lockers.length > 0) {
        let tempLockers: ReceptionLocker[] = [];
        let newLockers = [];
        for (let locker of lockers) {
          let existLocker = oldLockers?.find((l) => l.locker == +locker);
          if (existLocker) {
            tempLockers.push(existLocker);
          } else {
            let newLocker = new ReceptionLocker();
            newLocker.locker = +locker;
            tempLockers.push(newLocker);
            newLockers.push(newLocker);
          }
        }
        let removeLocker: ReceptionLocker[] = [];
        for (let locker of oldLockers || []) {
          let existLocker = lockers?.findIndex((l) => locker.locker == +l);
          if (existLocker < 0) {
            locker.deletedAt = new Date();
            removeLocker.push(locker);
          }
        }
        out = [...removeLocker, ...tempLockers];
      }
    } else {
      //! before
      // if (!oldLockers) {
      //   oldLockers = [];
      // }
      // if (quantity == oldLockers.length) {
      //   out = oldLockers;
      // } else if (quantity > oldLockers.length) {
      //   let finds = [];
      //   if (saleUnit.autoAssignPolicy == 'priority') {
      //     finds = await this.findLockerBasePriority(
      //       lockerLocationItems,
      //       saleUnit?.id
      //     );
      //   } else {
      //     for (let item of lockerLocationItems) {
      //       const result = await this.formulaAutoAssign(
      //         item?.quantity,
      //         saleUnit,
      //         item.lockerLocation
      //       );
      //       finds.push(...result);
      //     }
      //   }
      //   for (let findLocker of finds) {
      //     let newLocker = new ReceptionLocker();
      //     newLocker.locker = +findLocker.number || findLocker.lockerNumber;
      //     oldLockers.push(newLocker);
      //   }
      //   out = oldLockers;
      // } else {
      //   let i = 1;
      //   for (let l of oldLockers) {
      //     if (i > quantity) {
      //       l.deletedAt = new Date();
      //     }
      //     out.push(l);
      //     i++;
      //   }
      // }

      // !after

      if (oldLockers) {
        const oldLockersData = await this.prepareOldLockersData(oldLockers);
        lockerLocationItems = this.updateLockerLocationWithOldLocker(
          lockerLocationItems,
          oldLockersData
        );
        console.log(
          'lockerLocationItems----------------',
          lockerLocationItems,
          oldLockersData
        );
        const oldLockersIds = lockerLocationItems.flatMap((el) => el.lockers);
        oldLockers = oldLockers.map((el) => {
          if (!oldLockersIds.includes(el.locker)) {
            el.deletedAt = new Date();
          }
          console.log(
            'values-----------------------',
            oldLockers,
            lockerLocationItems
          );

          return el;
        });
      } else {
        oldLockers = [];
      }
      let finds = [];
      finds = await this.findLockersAuto(lockerLocationItems, saleUnit);
      for (let findLocker of finds) {
        let newLocker = new ReceptionLocker();
        newLocker.locker = +findLocker.number || findLocker.lockerNumber;
        oldLockers.push(newLocker);
      }
      out = oldLockers;
    }
    return out;
  }

  async findLockersAuto(
    lockerLocationsItems: LockerLocationDto[],
    saleUnit: SaleUnit
  ) {
    console.log('lockerLocationsItems-----------', lockerLocationsItems);
    let finds = [];
    let fullLockersId = await this.getFullLockerNumber(); //find all lockers that they are full right now
    const items = lockerLocationsItems.filter((el) => el.quantity > 0);
    fullLockersId.push(
      ...items
        .filter((e) => e.lockers && e.lockers.length > 0)
        .flatMap((el) => el.lockers)
    );
    for (let item of items) {
      let where: any = {
        type: LockerType.simple,
        status: true,
        lockerNumber: Not(In(fullLockersId))
      };
      if (item?.lockerLocation) {
        where = {
          ...where,
          locker: {
            ...where.locker,
            lockerLocation: { id: item.lockerLocation }
          }
        };
      }
      if (saleUnit.autoAssignPolicy == 'priority') {
        const lockers = await LockerItem.find({
          where: where,
          relations: { locker: { lockerLocation: true } },
          take: item?.quantity,
          order: { priority: 'ASC' }
        });
        if (!lockers || lockers.length < item.quantity) {
          throw new BadRequestException('no enough open locker');
        }
        finds.push(...lockers);
        fullLockersId.push(...lockers.map((el) => el.lockerNumber));
      } else {
        console.log('idssssssssssss', fullLockersId);
        const lockers = await LockerItem.find({
          where: where,
          relations: { locker: { lockerLocation: true } },
          order: { lockerNumber: 'ASC' }
        });
        if (lockers.length === 0) {
          throw new BadRequestException('no enough open locker');
        }
        const selectedLockers = await this.pickLockerNumberBaseFormula(
          item.quantity,
          saleUnit,
          lockers
        );
        if (!selectedLockers || selectedLockers.length < item.quantity) {
          throw new BadRequestException('no enough open locker');
        }
        finds.push(...selectedLockers);
        fullLockersId.push(...selectedLockers.map((el) => el.lockerNumber));
      }
    }
    return finds;
  }

  async pickLockerNumberBaseFormula(
    quantity: number,
    saleUnit: SaleUnit,
    lockers: LockerItem[]
  ) {
    console.log('called formulaAutoAssign');
    let formula = saleUnit.autoAssignPolicy || '2*n+1+b';
    let b = 0;
    let finds = [];
    try {
      let freeLockers = lockers;
      let freeLockerMap = freeLockers.reduce(
        (a, b) => Object.assign(a, { [b.lockerNumber]: b }),
        {}
      );
      const freeKeys = [...Object.keys(freeLockerMap).map((e) => +e)];
      const max = Math.max(...freeKeys);
      while ((b < freeLockers.length || finds.length < quantity) && b < max) {
        for (
          let n = 0;
          n < freeLockers.length && finds.length < quantity;
          n++
        ) {
          let number = eval(formula);
          let locker = freeLockerMap[number];
          if (locker && !finds.find((e) => e.id === locker.id)) {
            finds.push(locker);
          }
        }
        b++;
      }
      console.log(finds);
      return finds;
    } catch (e) {
      console.log(e);
      throw new BadRequestException('Invalid auto assign formula');
    }
  }

  async formulaAutoAssign(quantity: number, saleUnit: SaleUnit) {
    console.log('called formulaAutoAssign');
    let lockers = (await this.lockersStatusFullInfo()).sort((a, c) =>
      a.number > c.number ? 1 : -1
    );
    let formula = saleUnit.autoAssignPolicy || '2*n+1+b';
    let b = 0;
    let finds = [];
    try {
      let freeLockers: any[] = lockers.filter(
        (l) => l.status == LockerStatus.Released
      );
      if (freeLockers.length <= quantity) {
        for (let locker of freeLockers) {
          locker = LockerStatus.Locked;
        }
        return freeLockers;
      }
      let freeLockerMap = freeLockers.reduce(
        (a, b) => Object.assign(a, { [b.number]: b }),
        {}
      );
      while (b < freeLockers.length || finds.length < quantity) {
        for (
          let n = 0;
          n < freeLockers.length && finds.length < quantity;
          n++
        ) {
          let number = eval(formula);
          let locker = freeLockerMap[number];
          if (locker && locker.status == LockerStatus.Released) {
            locker.status = LockerStatus.Locked;
            finds.push(locker);
          }
        }
        b++;
      }
      console.log('finds', finds);
      return finds;
    } catch (e) {
      console.log(e);
      throw new BadRequestException('Invalid auto assign formula');
    }
  }

  async getFullLockerNumber() {
    return (
      await ReceptionLocker.find({
        where: {
          reception: {
            end: IsNull()
          }
        },
        relations: { reception: true },
        select: { locker: true }
      })
    )
      .filter((el) => el.reception)
      .map((e) => e.locker);
  }

  // now we dont use it
  async priorityAutoAssign(quantity: number) {
    let lockers = (await this.lockersStatus()).sort((a, c) =>
      a.priority > c.priority ? 1 : -1
    );
    let finds = [];
    try {
      let freeLockers = lockers.find(
        (l) => l.status == LockerStatus.Released && l.type == LockerType.simple
      );
      if (freeLockers?.length <= quantity) {
        for (let locker of freeLockers) {
          locker = LockerStatus.Locked;
        }
        return freeLockers;
      }
      for (let n = 0; n < lockers.length && finds.length < quantity; n++) {
        if (lockers[n].status == LockerStatus.Released) {
          lockers[n].status = LockerStatus.Locked;
          finds.push(lockers[n]);
          if (finds.length == quantity) {
            break;
          }
        }
      }
      return finds;
    } catch (e) {
      console.log(e);
      throw new BadRequestException('Invalid auto assign formula');
    }
  }

  async lockersStatus(lockerLocationIds?: string) {
    let where: any = { items: { lockerNumber: Not(0) } };
    if (lockerLocationIds && lockerLocationIds.split(',').length > 0) {
      where = {
        ...where,
        lockerLocation: { id: In(lockerLocationIds.split(',')) }
      };
    }
    console.log('where', where);
    const allLockers = await Locker.find({
      where: where,
      relations: { lockerLocation: true, items: true }
    });

    let lockerLockers = await ReceptionLocker.find({
      where: {
        reception: {
          end: IsNull(),
          id: Not(IsNull()),
          reception: true
          // saleUnit: { id: saleUnitId }
        }
      },
      relations: ['reception', 'reception.user']
    });
    const allVipLockers = await this.getVipLockers(
      moment().format(AppConstant.DATE_FORMAT) as any
    );
    let response: any[] = [];
    for (let Locker of allLockers) {
      let result: any[] = [];
      for (let locker of Locker.items) {
        let receptionLocker: ReceptionLocker;
        if (locker.status) {
          receptionLocker = lockerLockers.find(
            (x) => x.locker == locker.lockerNumber
          );
        }
        let vipLocker;
        if (locker.type === LockerType.vip) {
          // vipLocker = await this.getVipLockers(
          //   locker.locker.saleUnitId,
          //   moment().format(AppConstant.DATE_FORMAT) as any,
          //   locker.id
          // );
          vipLocker = [
            allVipLockers.find((item) => (item?.id ?? 0) === (locker?.id ?? 0))
          ];
        }

        if (locker.lockerNumber === 72) {
          console.log('locker number 72', receptionLocker);
        }

        result.push({
          number: locker.lockerNumber,
          priority: locker.priority,
          status: locker.status
            ? receptionLocker || locker.type == LockerType.vip
              ? LockerStatus.Locked
              : LockerStatus.Released
            : LockerStatus.disabled,
          user:
            locker.type == LockerType.vip
              ? vipLocker && vipLocker.length > 0 && vipLocker[0]?.userId
                ? vipLocker[0]?.userId
                : null
              : receptionLocker
              ? receptionLocker.reception?.user?.id
              : null,

          userInfo:
            locker.type == LockerType.vip
              ? vipLocker && vipLocker.length > 0 && vipLocker[0]?.userId
                ? {
                    id: vipLocker[0]?.userId,
                    code: vipLocker[0].code,
                    firstName: vipLocker[0].firstName,
                    lastName: vipLocker[0].lastName
                  }
                : null
              : receptionLocker
              ? receptionLocker.reception?.user
              : null,
          id: locker.id,
          type: locker.type
        });
      }
      console.log(Locker.lockerLocationId);
      const index = response.findIndex(
        (value) =>
          value.lockerLocation?.id === Locker.lockerLocationId &&
          Locker.lockerLocationId
      );
      if (index > -1) {
        response[index].items.push(...result);
      } else {
        if (!Locker.lockerLocation) {
          const index = response.findIndex(
            (value) => value.lockerLocation === null
          );
          if (index > -1) {
            response[index].items.push(...result);
          } else {
            response.push({
              lockerLocation: Locker?.lockerLocation,
              items: result
            });
          }
        } else {
          response.push({
            lockerLocation: Locker?.lockerLocation,
            items: result
          });
        }
      }
    }
    return response;
  }

  async lockersStatusFullInfo(
    lockerLocationIds?: string,
    getVipReceptions: boolean = false
  ) {
    let where: any = {
      lockerNumber: Not(0)
    };
    if (lockerLocationIds && lockerLocationIds.split(',').length > 0) {
      where = {
        ...where,
        locker: { lockerLocation: { id: In(lockerLocationIds.split(',')) } }
      };
    }
    let lockers = await LockerItem.find({
      where: where,
      order: { lockerNumber: 'ASC' },
      relations: { locker: { lockerLocation: true } }
    });
    let lockerLockers = await ReceptionLocker.find({
      where: {
        reception: {
          end: IsNull(),
          reception: true
          // saleUnit: { id: saleUnitId }
        }
      },
      relations: ['reception', 'reception.user', 'reception.saleUnit']
    });
    let result: any[] = [];
    let vipLockerIds =
      lockers
        ?.filter((locker) => locker?.type === LockerType.vip)
        ?.map((item) => item?.id) ?? [];

    const today = moment().format('YYYY-MM-DD');
    let viplockerSaleItems = await SaleItem.find({
      where: {
        locker: { id: In(vipLockerIds) },
        end: MoreThanOrEqual(moment(today) as any)
      },
      relations: { user: true, locker: true }
    });

    for (let locker of lockers) {
      let receptionLocker: ReceptionLocker;

      receptionLocker = lockerLockers?.find(
        (x) =>
          x.locker == locker.lockerNumber && locker.type == LockerType.simple
      );
      let vipInfo;
      let vipReception;
      if (locker.type === LockerType.vip) {
        vipInfo = viplockerSaleItems?.find(
          (saleItemVipLocker) => locker.id === saleItemVipLocker?.locker?.id
        );
        if (getVipReceptions && vipInfo && vipInfo.locker.lockerNumber) {
          vipReception = await SaleOrder.findOne({
            where: {
              reception: true,
              vipLocker: { lockerNumber: vipInfo.locker.lockerNumber }
            },
            relations: { vipLocker: true }
          });
        }
      }
      if (
        !result.find(
          (e) =>
            e.number === locker.lockerNumber &&
            e.saleUnit === receptionLocker?.reception?.saleUnit?.id
        )
      ) {
        result.push({
          saleUnit: receptionLocker?.reception?.saleUnit?.id,
          number: locker.lockerNumber,
          priority: locker.priority,
          status: locker.status
            ? receptionLocker ||
              (locker.type == LockerType.vip && vipInfo?.user)
              ? LockerStatus.Locked
              : LockerStatus.Released
            : LockerStatus.disabled,
          userInfo: receptionLocker?.reception?.user || vipInfo?.user,
          reception: receptionLocker?.reception?.id,
          id: locker.id,
          deviceId: locker.locker?.id,
          relayDelayTime: locker.locker?.relayDelayTime,
          relayOnTime: locker.locker?.relayOnTime,
          deviceName: locker?.locker?.title,
          loginTime:
            receptionLocker?.reception?.submitAt || vipReception?.submitAt,
          type: locker.type,
          vip: locker.type === LockerType.vip,
          end: vipInfo?.end
        });
      }
    }
    return result;
  }

  async unlock(id: number) {
    let locker = await LockerItem.findOne({
      where: { id: id },
      relations: ['locker']
    });
    if (!locker) {
      throw new BadRequestException('Not found locker');
    }
    let receptionLocker = await ReceptionLocker.findOne({
      where: {
        reception: {
          end: IsNull()
          // saleUnit: { id: locker.locker?.saleUnitId }
        },
        locker: locker.lockerNumber
      },
      relations: ['reception']
    });
    if (receptionLocker) {
      await receptionLocker.remove();
    }
    return true;
  }

  async getVipLockers(submitAt?: Date, id?: number) {
    const query = await LockerItem.createQueryBuilder('q')
      .select([])
      .addSelect('q.id', 'id')
      .addSelect('q.locker_number', 'lockerNumber')
      .addSelect('q.priority', 'priority')
      .addSelect('user.id', 'userId')
      .addSelect('user.first_name', 'firstName')
      .addSelect('user.last_name', 'lastName')
      .addSelect('user.code', 'code')
      .addSelect('si.end_date', 'end')
      .leftJoin('q.locker', 'locker')
      .leftJoin(
        (qb) =>
          qb
            .from(SaleItem, 's')
            .select(['s.locker', 's.end_date', 's.user'])
            .innerJoin(
              (qb1) =>
                qb1
                  .from(SaleItem, 'temp')
                  .select([])
                  .addSelect('temp.locker', 'locker')
                  .addSelect('MAX(temp.end)', 'end')
                  .leftJoin('temp.saleOrder', 'so')
                  .where('temp.locker IS NOT NULL')
                  // .andWhere('so.sale_unit = :saleUnit', { saleUnit: saleUnit })
                  .andWhere({
                    end: MoreThanOrEqual(
                      moment(submitAt).format(AppConstant.DATE_FORMAT)
                    )
                  })
                  .andWhere({ status: RegisteredServiceStatus.opened })
                  .groupBy('temp.locker'),
              's1',
              's1.locker=s.locker AND s1.end=s.end'
            ),
        'si',
        'si.locker = q.id'
      )
      .leftJoin(User, 'user', 'si.user=user.id')
      .where({ type: LockerType.vip, status: true });
    // .andWhere('locker.sale_unit = :saleUnit', { saleUnit: saleUnit });

    if (id) {
      query.andWhere('q.id= :Id', { Id: id });
    }

    return query.orderBy('q.id').getRawMany();
  }

  async getUserVipLocker(user: number, saleUnit?: number, submitAt?: Date) {
    const query = await SaleItem.createQueryBuilder('t')
      .leftJoin('t.saleOrder', 'so')
      .innerJoinAndSelect('t.locker', 'locker')
      .leftJoinAndSelect('locker.locker', 'lockera')
      .where({
        user: { id: +user }
      })
      .andWhere(`t.end_date >= :end`, {
        end: moment(submitAt).utc(true).format(AppConstant.DATE_FORMAT)
      })
      .andWhere({
        status: RegisteredServiceStatus.opened
      })
      .andWhere(`t.start_date <= :start`, {
        start: moment(submitAt)
          .utc(true)
          .add(1, 'day')
          .format(AppConstant.DATE_FORMAT)
      })
      .andWhere(`so.settle_amount = so.total_amount`);

    if (saleUnit) {
      query.andWhere('so.sale_unit = :sale_unit', { sale_unit: saleUnit });
    }

    return (await query.orderBy({ 't.start_date': 'ASC' }).limit(1).getOne())
      ?.locker;
  }

  async getUserLocker(user: number, saleUnit: number, submitAt?: Date) {
    const reception = await SaleOrder.createQueryBuilder('q')
      .leftJoin('q.user', 'user')
      .leftJoinAndSelect('q.vipLocker', 'viplocker')
      .leftJoinAndSelect('q.lockers', 'lockers')
      .where('user.id =:userId', { userId: user })
      .andWhere('q.reception=true')
      .andWhere(`(q.end_date >= :end OR q.end_date is null)`, {
        end: moment(submitAt).format(AppConstant.DATETIME_FORMAT)
      })
      .andWhere(`q.start_date <= :start`, {
        start: moment(submitAt)
          .utc(true)
          .add(1, 'day')
          .format(AppConstant.DATE_FORMAT)
      })
      .getMany();
    const lockers = [];
    for (let sale of reception) {
      if (sale?.vipLocker && sale?.vipLocker?.id) {
        const { locker } = await LockerItem.findOne({
          where: { id: sale?.vipLocker?.id },
          relations: ['locker']
        });

        lockers.push({
          locker: sale.vipLocker.lockerId,
          saleUnit: sale.saleUnitId,
          relayNumber: sale.vipLocker.relayNumber,
          lockerNumber: sale.vipLocker.lockerNumber,
          id: sale.vipLocker.id,
          state: sale.vipLocker.state,
          status: sale.vipLocker.status,
          relayDelayTime: locker?.relayDelayTime,
          relayOnTime: locker?.relayOnTime,
          vip: true
        });
      }
      if (sale.lockers?.length > 0) {
        for (let lock of sale.lockers) {
          const x = await LockerItem.findOne({
            where: { lockerNumber: lock.locker },
            relations: ['locker']
          });

          lockers.push({
            locker: x?.locker?.id,
            saleUnit: sale.saleUnitId,
            relayNumber: x.relayNumber,
            lockerNumber: x.lockerNumber,
            state: x.state,
            relayDelayTime: x.locker?.relayDelayTime,
            relayOnTime: x.locker?.relayOnTime,
            status: x.status,
            id: x.id,
            vip: false
          });
        }
      }
    }
    return { content: lockers, total: lockers.length };
  }

  async prepareOldLockersData(oldLockers: any[]) {
    if (oldLockers && oldLockers.length > 0) {
      const olds = await LockerItem.find({
        where: {
          lockerNumber: In(oldLockers.map((e) => e.locker))
        },
        relations: { locker: { lockerLocation: true } },
        order: { priority: 'ASC' }
      });
      return Object.values(
        olds.reduce((pre, current) => {
          if (!current.locker?.lockerLocation?.id)
            current.locker = {
              ...current.locker,
              lockerLocation: { id: 0 } as any
            } as any;
          pre[`${current.locker.lockerLocation.id}`] = pre[
            `${current.locker.lockerLocation.id}`
          ] ?? {
            lockerLocation: current.locker.lockerLocation.id,
            quantity: 0,
            lockers: []
          };
          pre[`${current.locker.lockerLocation.id}`].quantity += 1;
          pre[`${current.locker.lockerLocation.id}`].lockers.push(
            current.lockerNumber
          );
          return pre;
        }, {} as any)
      );
    }
  }

  updateLockerLocationWithOldLocker(
    lockerLocationItems: any[],
    oldLocker: any[]
  ) {
    if (!oldLocker || oldLocker?.length === 0) return lockerLocationItems;
    const lockers = oldLocker.filter((e) =>
      lockerLocationItems.find((el) => e.lockerLocation === el.lockerLocation)
    );
    console.log('lockers', lockers);

    oldLocker.map((el) => {
      const index = lockerLocationItems.findIndex((e) => {
        console.log(e.lockerLocation, el);
        return e.lockerLocation === el.lockerLocation;
      });
      if (index > -1) {
        lockerLocationItems[index].lockers = el.lockers.slice(
          0,
          lockerLocationItems[index].quantity
        );
        lockerLocationItems[index].quantity =
          +lockerLocationItems[index].quantity > +el.quantity
            ? lockerLocationItems[index].quantity - el.quantity
            : 0;
      }
    });

    return lockerLocationItems;
  }
}
