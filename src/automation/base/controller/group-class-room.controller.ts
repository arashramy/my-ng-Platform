import { BadRequestException, Controller, Get } from '@nestjs/common';
import {
  PermissionAction,
  PermissionKey
} from '../../../common/constant/auth.constant';
import { BaseController } from '../../../common/controller/base.controller';
import { GroupClassRoom } from '../entities/GroupClassRoom';
import { SaleItem } from '../../operational/entities/SaleItem';
import { LessThanOrEqual, MoreThan, MoreThanOrEqual } from 'typeorm';
import moment from 'moment';
import { User } from '../../../base/entities/User';
import { GroupClassRoomSchedules } from '../entities/GroupClassRoomSchedules';
import { Product } from '../entities/Product';
import { plainToInstance } from 'class-transformer';
import { GroupClassRoomService } from '../dto/group-class-room-service.dto';

@Controller('/api/group-class-room')
export class GroupClassRoomController extends BaseController<GroupClassRoom> {
  constructor() {
    super(GroupClassRoom, PermissionKey.AUTOMATION_BASE_GROUP_CLASS_ROOM);
  }

  additionalPermissions(): any[] {
    return [
      PermissionKey.AUTOMATION_OPT_REGISTERED_SERVICE,
      `${PermissionKey.AUTOMATION_OPT_REGISTERED_SERVICE}_${PermissionAction.READ}`,
      `${PermissionKey.AUTOMATION_OPT_REGISTERED_SERVICE}_${PermissionAction.CREATE}`,
      `${PermissionKey.AUTOMATION_OPT_REGISTERED_SERVICE}_${PermissionAction.UPDATE}`
    ];
  }

  async postFetchAll(result: GroupClassRoom[]): Promise<GroupClassRoom[]> {
    const data = await super.postFetchAll(result);
    const today = moment().format('YYYY/MM/DD');
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < data[i]?.configs.length; j++) {
        console.log(today);
        const filled = (
          await SaleItem.find({
            where: {
              contractor: { id: data?.[i]?.configs?.[j]?.contractorId },
              groupClassRoom: { id: data?.[i]?.id },
              end: MoreThanOrEqual(today as any),
              start: LessThanOrEqual(today as any)
            },
            relations: {
              groupClassRoom: true,
              contractor: true
            }
          })
        ).filter((e) => e.credit - e.usedCredit > 0);
        data[i].configs[j] = {
          ...data[i].configs[j],
          filled: filled.length
        } as any;
      }
    }
    return data;
  }

  async prepareDelete(id: number | number[]): Promise<void> {
    const locations = await SaleItem.count({
      where: { groupClassRoom: { id: id as number } }
    });
    if (locations > 0) {
      throw new BadRequestException('you cant delete when registered service');
    }
  }

  async prepareCreate(
    model: GroupClassRoom,
    current: User
  ): Promise<GroupClassRoom> {
    const entity = await super.prepareCreate(model, current);
    if (model.schedules) {
      const schedules: GroupClassRoomSchedules[] = [];
      for (let i = 0; i < model.schedules.length; i++) {
        const groupClassRoomSchedule = model.schedules?.[i];
        const schedule = await GroupClassRoomSchedules.save(
          GroupClassRoomSchedules.create({
            days: groupClassRoomSchedule.days,
            from: groupClassRoomSchedule.from,
            to: groupClassRoomSchedule.to
          })
        );
        schedules.push(schedule);
      }
      entity.schedules = schedules;
    }
    return entity;
  }

  async prepareEdit(
    model: GroupClassRoom,
    entity: GroupClassRoom,
    current: User
  ): Promise<GroupClassRoom> {
    const updatedEntity = await super.prepareEdit(model, entity, current);
    if (entity.schedules) {
      const schedules: GroupClassRoomSchedules[] = [];
      for (let i = 0; i < model.schedules.length; i++) {
        const groupClassRoomSchedule = model.schedules?.[i];
        const schedule = await GroupClassRoomSchedules.save(
          GroupClassRoomSchedules.create({
            days: groupClassRoomSchedule.days,
            from: groupClassRoomSchedule.from,
            to: groupClassRoomSchedule.to
          })
        );
        schedules.push(schedule);
      }
      updatedEntity.schedules = schedules;
    }
    return updatedEntity;
  }

  @Get('/services')
  async getServiceOfGroupClassRoom() {
    return (
      await GroupClassRoom.createQueryBuilder('q')
        .addSelect('service.id')
        .addSelect('service.title')
        .addSelect('service.price')
        .leftJoinAndSelect(Product, 'service', 'service.id = q.service')
        .addGroupBy('q.id')
        .addGroupBy('service.id')
        .getRawMany()
    )
      .map((groupClassRoom) =>
        plainToInstance(GroupClassRoomService, groupClassRoom, {
          exposeUnsetFields: true,
          excludeExtraneousValues: true
        })
      )
      .reduce((acc: GroupClassRoomService[], item) => {
        if (
          !acc.find(
            (element) => element.id === item.id && element.title === item.title
          )
        ) {
          acc.push(item);
        }
        return acc;
      }, []);
  }
}
