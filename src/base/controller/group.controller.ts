import {Body, Controller, Get, InternalServerErrorException, Param, Put, UseGuards,} from '@nestjs/common';
import {BaseController, common_permissions,} from '../../common/controller/base.controller';
import {PermissionAction, PermissionKey,} from '../../common/constant/auth.constant';
import {WorkGroup} from '../entities/WorkGroup';
import {AccessTokenGuard} from '../../auth/guard/access-token.guard';
import {CurrentUser} from '../../auth/decorators/current-user.decorator';
import {User} from '../entities/User';
import {Dashboard} from '../entities/Dashboard';
import {In} from 'typeorm';
import {Permissions} from '../../auth/decorators/permissions.decorator';
import {Permission} from "../entities/Permission";
import {UpdateResult} from "typeorm/query-builder/result/UpdateResult";

@Controller('/api/groups')
export class GroupController extends BaseController<WorkGroup> {
  constructor() {
    super(WorkGroup, PermissionKey.BASE_GROUPS);
  }

  additionalPermissions(): any[] {
    return [
      PermissionKey.BASE_USERS,
      `${PermissionKey.BASE_USERS}_${PermissionAction.READ}`,
      `${PermissionKey.BASE_USERS}_${PermissionAction.CREATE}`,
      `${PermissionKey.BASE_USERS}_${PermissionAction.UPDATE}`,
    ];
  }

  async postFetchAll(result: WorkGroup[]): Promise<WorkGroup[]> {
    if (result && result.length > 0) {
      let permissions = await Permission.findBy({group: In(result.map(g => g.id))});
      let maps = permissions.reduce((r, a) => {
        r[a.group] = r[a.group] || [];
        r[a.group].push(a);
        return r;
      }, Object.create(null));
      for (let group of result) {
        group.permissions = maps[group.id];
      }
    }
    return super.postFetchAll(result);
  }

  async postEdit(model: WorkGroup, entity: WorkGroup, current: User): Promise<WorkGroup> {
    await Permission.delete({group: entity.id});
    for (let permission of model.permissions) {
      permission.group = model.id;
      permission.createdAt = new Date();
    }
    entity.permissions = await Permission.save(model.permissions);
    return super.postEdit(model, entity, current);
  }

  async postCreate(model: WorkGroup, current: User): Promise<WorkGroup> {
    for (let permission of model.permissions) {
      permission.group = model.id;
      permission.createdAt = new Date();
    }
    model.permissions = await Permission.save(model.permissions);
    return super.postCreate(model, current);
  }

  async postDelete(id: number[] | number, result: UpdateResult, current: User): Promise<boolean> {
    await super.postDelete(id, result, current);
    if (result.affected > 0) {
      await Permission.delete({group: Array.isArray(id) ? In(id) : id});
    }
    return true;
  }

  @Get('/dashboard')
  @UseGuards(AccessTokenGuard)
  async getOwnerWidgets(
      @CurrentUser({transient: false, groups: true}) current: User,
  ) {
    let dashboards = await Dashboard.find({
      where: {group: In(current.groups.map((g) => g.id))},
      cache: true,
    });
    return dashboards.map((d) => {
      let group = current.groups.find((g) => g.id == d.group);
      return {
        title: group.title,
        widgets: d.widgets,
      };
    });
  }

  @Get('/dashboard/:id')
  @Permissions([
    ...common_permissions,
    PermissionKey.BASE_GROUPS,
    `${PermissionKey.BASE_GROUPS}_${PermissionAction.DASHBOARD}`,
  ])
  async getWidgets(@Param('id') id: number) {
    let setting = await Dashboard.findOneBy({ group: id });
    return setting?.widgets || {};
  }

  @Put('/dashboard/:id')
  @Permissions([
    ...common_permissions,
    PermissionKey.BASE_GROUPS,
    `${PermissionKey.BASE_GROUPS}_${PermissionAction.DASHBOARD}`,
  ])
  async editWidgets(
    @Param('id') id: number,
    @Body() widgets: any,
    @CurrentUser() current: User,
  ) {
    let setting: Dashboard = await Dashboard.findOneBy({ group: id });
    if (!setting) {
      setting = new Dashboard();
      setting.group = id;
      setting.updatedBy = current;
    } else {
      setting.updatedBy = current;
    }
    setting.widgets = widgets;
    try {
      let result = await Dashboard.save(setting);
      return result.widgets;
    } catch (e) {
      throw new InternalServerErrorException(e.message);
    }
  }
}
