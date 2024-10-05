import { BaseController } from '../../common/controller/base.controller';
import { PermissionKey } from '../../common/constant/auth.constant';
import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { IsNull, LessThanOrEqual, MoreThan, MoreThanOrEqual } from 'typeorm';
import { UserEvent } from '../entities/UserEvent';
import { Role, User } from '../../base/entities/User';

@Controller('/api/user-events')
export class UserEventController extends BaseController<UserEvent> {
  constructor() {
    super(UserEvent, PermissionKey.CRM_OPT_EVENT);
  }

  findAllPaging(): 'take' | 'offset' {
    return 'offset';
  }

  @Get('/messages')
  async getEvents(
    @Query('offset') offset: number,
    @Query('limit') limit: number,
    @CurrentUser() user: User,
  ) {
    let groups = user.groups?.length ? user.groups.map((g) => g.id) : [-1];
    return (
      await UserEvent.createQueryBuilder('q')
        .leftJoin('q.groups', 'groups')
        .where({
          showAt: LessThanOrEqual(new Date()),
        })
        .andWhere([
          { expiredAt: IsNull() },
          { expiredAt: MoreThanOrEqual(new Date()) },
        ])
        .andWhere(
          `q.roles IS NULL OR jsonb_array_length(q.roles::jsonb) = 0 OR q.roles::jsonb ?| array[${user.roles
            ?.map((r) => `'${r}'`)
            .join(',')}]`,
        )
        .andWhere(`q.user IS NULL OR q.user = :user`, { user: user.id })
        .andWhere(`(groups.id IS NULL OR groups.id IN (:...groups))`, {
          groups,
        })
        .orderBy('q.id', 'DESC')
        .offset(offset || 0)
        .limit(limit || 10)
        .getMany()
    ).map((ue) => {
      ue.groups = [];
      return ue;
    });
  }

  @Get('/dashboard')
  async getDashboard(
    @Query('offset') offset: number,
    @Query('limit') limit: number,
    @CurrentUser() user: User,
  ) {
    let groups = user.groups?.length ? user.groups.map((g) => g.id) : [-1];
    return (
      await UserEvent.createQueryBuilder('q')
        .leftJoin('q.groups', 'groups')
        .where({
          showAt: LessThanOrEqual(new Date()),
        })
        .andWhere([
          { expiredAt: IsNull() },
          { expiredAt: MoreThanOrEqual(new Date()) },
        ])
        .andWhere(
          `q.roles IS NULL OR jsonb_array_length(q.roles::jsonb) = 0 OR q.roles::jsonb ?| array[${user.roles
            ?.map((r) => `'${r}'`)
            .join(',')}]`,
        )
        .andWhere(`q.user IS NULL OR q.user = :user`, { user: user.id })
        .andWhere(`(groups.id IS NULL OR groups.id IN (:...groups))`, {
          groups,
        })
        .orderBy('q.id', 'DESC')
        .offset(offset || 0)
        .limit(limit || 5)
        .getMany()
    ).map((ue) => {
      ue.groups = [];
      return ue;
    });
  }

  @Get('/unread-count')
  async getEventsCount(@CurrentUser({ transient: false }) user: User) {
    let groups = user.groups?.length ? user.groups.map((g) => g.id) : [-1];
    return UserEvent.createQueryBuilder('q')
      .leftJoin('q.groups', 'groups')
      .where({
        showAt: LessThanOrEqual(new Date()),
        id: MoreThan(user.lastEventId),
      })
      .andWhere([
        { expiredAt: IsNull() },
        { expiredAt: MoreThanOrEqual(new Date()) },
      ])
      .andWhere(
        `q.roles IS NULL OR jsonb_array_length(q.roles::jsonb) = 0 OR q.roles::jsonb ?| array[${user.roles
          ?.map((r) => `'${r}'`)
          .join(',')}]`,
      )
      .andWhere(`q.user IS NULL OR q.user = :user`, { user: user.id })
      .andWhere(`(groups.id IS NULL OR groups.id IN (:...groups))`, { groups })
      .getCount();
  }

  @Get('/read')
  async updateLastId(@CurrentUser() user: User) {
    let last = await UserEvent.createQueryBuilder('q')
      .select(['q.id'])
      .orderBy('q.id', 'DESC')
      .offset(0)
      .limit(1)
      .getOne();
    if (last) {
      await User.update(user.id, {
        lastEventId: last.id,
      });
    }
    return true;
  }

  additionalPermissions(): string[] {
    return [Role.Membership];
  }
}
