import {
  PermissionAction,
  PermissionKey
} from '../../../common/constant/auth.constant';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  SetMetadata,
  UseGuards
} from '@nestjs/common';
import {
  BaseController,
  common_permissions
} from '../../../common/controller/base.controller';
import { Locker } from '../entities/Locker';
import { LockerItem, LockerType } from '../../operational/entities/LockerItem';
import { ReceptionLocker } from '../../operational/entities/ReceptionLocker';
import { User } from '../../../base/entities/User';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { RemoteTokenGuard } from '../../../auth/guard/remote-token.guard';
import { DataSource, In, MoreThanOrEqual, Not } from 'typeorm';
import { LockerService } from '../service/locker.service';
import moment from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { UpdateLockerItemDTO } from '../dto/update-locker-item.dto';
import { SaleItem } from '../../../automation/operational/entities/SaleItem';
import { isIP, isIPv4 } from 'net';

@Controller('/api/locker')
export class LockerController extends BaseController<Locker> {
  constructor(private lockerService: LockerService, private ds: DataSource) {
    super(Locker, PermissionKey.AUTOMATION_BASE_LOCKERS);
  }

  additionalPermissions(): string[] {
    return [];
  }

  @Get('/vip/:id')
  @Permissions([
    ...common_permissions,
    PermissionKey.AUTOMATION_OPT_ORDERS,
    PermissionKey.AUTOMATION_OPT_LOCKER
  ])
  async getVipLockers(
    @Param('id') saleUnitId: number,
    @Query('submitAt') submitAt: string
  ) {
    return this.lockerService.getVipLockers(
      submitAt && moment(submitAt, AppConstant.DATE_FORMAT).isValid()
        ? moment(submitAt, AppConstant.DATE_FORMAT).utc(true).toDate()
        : new Date()
    );
  }

  @Get('/vip/:saleUnit/:user')
  @Permissions([
    ...common_permissions,
    PermissionKey.AUTOMATION_OPT_ORDERS,
    PermissionKey.AUTOMATION_OPT_LOCKER
  ])
  async getUserLocker(
    @Param('saleUnit') saleUnitId: number,
    @Param('user') user: number,
    @Query('submitAt') submitAt: string
  ) {
    return this.lockerService.getUserVipLocker(
      user,
      saleUnitId,
      submitAt && moment(submitAt, AppConstant.SUBMIT_TIME_FORMAT).isValid()
        ? moment(submitAt, AppConstant.SUBMIT_TIME_FORMAT).utc(true).toDate()
        : new Date()
    );
  }

  @Get('/personal')
  async getPersonalLockers(
    @CurrentUser() current: User,
    @Query('saleUnit') saleUnnit: number
  ) {
    return await this.lockerService.getUserLocker(
      current.id,
      saleUnnit,
      new Date()
    );
  }

  @Get('/status')
  @Permissions([
    ...common_permissions,
    PermissionKey.AUTOMATION_BASE_LOCKERS,
    PermissionKey.AUTOMATION_OPT_RECEPTION,
    `${PermissionKey.AUTOMATION_BASE_LOCKERS}_${PermissionAction.READ}`,
    `${PermissionKey.AUTOMATION_OPT_RECEPTION}_${PermissionAction.READ}`,
    `${PermissionKey.AUTOMATION_OPT_RECEPTION}_${PermissionAction.CREATE}`,
    `${PermissionKey.AUTOMATION_OPT_RECEPTION}_${PermissionAction.UPDATE}`
  ])
  async lockersStatus(@Query() query: any) {
    return this.lockerService.lockersStatus(query.lockerLocationIds);
  }

  @Get('/status-full')
  @Permissions([...common_permissions, PermissionKey.AUTOMATION_OPT_LOCKER])
  async lockersStatusFull(@Query() query?: any) {
    console.log('query',query)
    return this.lockerService.lockersStatusFullInfo(
      query?.lockerLocationIds,
      query.getVipReceptions
    );
  }

  @Get('/all')
  @SetMetadata('disable-auth-guard', true)
  @UseGuards(RemoteTokenGuard)
  getAll(@Query() params: any, @CurrentUser() current: User) {
    return super.findAll(params, {
      ...current!,
      permissions: [`BASE_LOCKERS_${PermissionAction.READ}`]
    } as any);
  }

  @Get('item/:id')
  async getByItemId(@Param('id') id: number) {
    const locker = await Locker.findOne({
      where: { items: { id: +id } },
      relations: ['items']
    });
    return locker;
  }

  async prepareEdit(
    model: Locker,
    entity: Locker,
    current: User
  ): Promise<Locker> {
    if (model.ipAddress) {
      const isIp = isIPv4(model.ipAddress);
      console.log(isIp);
      if (!isIp) {
        throw new BadRequestException('the ip address is not valid');
      }
    }

    const lockerItems = await LockerItem.findBy({ locker: { id: entity.id } });
    const newLockerItems = model?.items?.filter(
      (m) =>
        !lockerItems.find((e) => {
          return m.lockerNumber === e.lockerNumber;
        })
    );

    for (let item of newLockerItems) {
      if (!item.status && item.lockerNumber !== 0) {
        const disableLocker = lockerItems.find(
          (e) => e.id === item.id && e.lockerNumber === 0
        );
        if (disableLocker) {
          model.items = model.items.map((e) => {
            if (e.id === item.id) {
              e.status = true;
            }
            return e;
          });
        }
      }
    }

    model.items = model.items.map((e) => {
      if (e.lockerNumber === 0) {
        e.status = false;
      }
      return e;
    });

    if (model?.items?.length > 0) {
      const errors = [];
      model?.items?.reduce((acc: LockerItem[], item) => {
        if (item.lockerNumber === 0) {
          acc.push(item);
          return acc;
        } else {
          const x = acc.find((e) => e.lockerNumber === item.lockerNumber);

          if (!x) acc.push(item);
          else {
            errors.push(item);
          }
        }
        return acc;
      }, []);
      if (errors.length != 0) {
        throw new BadRequestException({
          message: 'invalid locker number',
          data: errors.map((e) => lockerItems.find((e2) => e2.id === e.id))
        });
      }
    }

    const newLockerItemsIds = newLockerItems
      .filter((e) => e.lockerNumber !== 0)
      .map((e) => e.lockerNumber);

    const [takeIdsBeforeData, takeIdsBeforeCount] =
      await LockerItem.findAndCount({
        where: {
          lockerNumber: In(newLockerItemsIds)
          // locker: { saleUnit: { id: entity.saleUnitId } } //! remove saleUnit from locker
        }
        // relations: ['locker.saleUnit']
      });
    if (takeIdsBeforeCount > 0) {
      throw new BadRequestException({
        message: 'duplicate locker number',
        data: takeIdsBeforeData
      });
    }

    for (let item of model.items) {
      let submittedItem = lockerItems.find((i) => i.id == item.id);
      if (submittedItem) {
        item.updatedBy = current;
        item.createdBy = submittedItem.createdBy;
        item.createdAt = submittedItem.createdAt;
      } else {
        item.createdBy = current;
      }
    }
    for (let key of Object.keys(model)) {
      entity[key] = model[key];
    }
    entity.updatedBy = current;
    return entity;
  }

  async prepareCreate(model: Locker, current: User): Promise<Locker> {
    if (model.ipAddress) {
      const isIp = isIPv4(model.ipAddress);
      console.log(isIp);
      if (!isIp) {
        throw new BadRequestException('the ip address is not valid');
      }
    }

    model.items = model.items.map((e) => {
      if (e.lockerNumber === 0) {
        e.status = false;
      }
      return e;
    });

    let entity = await super.prepareCreate(model, current);
    const takeEntityBefore = await this.validUniqueLockerNumber(entity);
    console.log('takeEntityBefore', takeEntityBefore);
    if (takeEntityBefore.length !== 0)
      throw new BadRequestException({
        message: 'invalid locker numbers',
        data: takeEntityBefore
      });
    for (let item of entity.items) {
      item.createdBy = current;
    }
    return entity;
  }

  async validUniqueLockerNumber(entity: Locker, entityId?: number) {
    const lockerItems = entity?.items || [];
    const enableLockers = lockerItems.filter((e) => e.lockerNumber !== 0);
    const lockerItemsIds = enableLockers.map((e) => e.lockerNumber);
    const hasduplicate = lockerItemsIds.some((element, index) => {
      return lockerItemsIds.indexOf(element) !== index;
    });
    if (hasduplicate) {
      throw new BadRequestException('duplicate locker numbers');
    }
    const isValidLocal =
      [...new Set(lockerItemsIds)].length === lockerItems.length;
    if (!isValidLocal) [];
    let takeBeforeIds = await LockerItem.createQueryBuilder('q')
      .where({
        lockerNumber: In(lockerItemsIds)
      })
      .leftJoin('q.locker', 'locker');
    // .leftJoin('locker.saleUnit', 'saleUnit')
    // .andWhere('saleUnit.id=:saleUnit', { saleUnit: entity.saleUnit.id });  //! remove saleunit from location
    if (entityId)
      takeBeforeIds = takeBeforeIds.andWhere({ lockerNumber: Not(entityId) });
    return await takeBeforeIds.getMany();
  }
  async prepareDelete(id: number | number[], current: User): Promise<void> {
    const locker = await LockerItem.find({
      where: { locker: { id: id as number } },
      select: { lockerNumber: true, relayNumber: false, type: false }
    });
    const lockerNumbers = locker.map((e) => e.lockerNumber);

    const receptionLocker = await ReceptionLocker.find({
      where: { locker: In(lockerNumbers) }
    });

    // if (receptionLocker.length > 0) {
    //   throw new BadRequestException(
    //     'You Cant Delete locker When Use in receptionLocker'
    //   );
    // }

    await LockerItem.delete({ lockerNumber: In(lockerNumbers) });
  }

  @Patch('item/:id')
  async updateLockerItem(
    @Body() body: UpdateLockerItemDTO,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User
  ) {
    const lockerItem = await LockerItem.findOne({ where: { id } });
    if (!lockerItem) {
      throw new NotFoundException('locker item is not defined');
    }
    if (typeof body.type !== typeof undefined) {
      const end = moment().add(1, 'day') as any;
      const vipLocker = await SaleItem.count({
        where: {
          locker: { id: lockerItem.id, type: LockerType.vip },
          end: MoreThanOrEqual(end)
        }
      });
      if (vipLocker > 0) {
        throw new BadRequestException('this locker has active reception');
      }
    }
    Object.assign(lockerItem, body);
    lockerItem.updatedBy = user;
    lockerItem.updatedAt = new Date();
    return lockerItem.save();
  }
}
