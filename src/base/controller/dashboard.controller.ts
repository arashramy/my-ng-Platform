import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  InternalServerErrorException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {common_permissions, hasAnyPermissions,} from '../../common/controller/base.controller';
import {PermissionAction, PermissionKey,} from '../../common/constant/auth.constant';
import {AccessTokenGuard} from '../../auth/guard/access-token.guard';
import {CurrentUser} from '../../auth/decorators/current-user.decorator';
import {Role, User} from '../entities/User';
import {Dashboard} from '../entities/Dashboard';
import {In} from 'typeorm';
import {WorkGroup} from "../entities/WorkGroup";
import {OrganizationUnit} from "../entities/OrganizationUnit";
import {AppConstant} from "../../common/constant/app.constant";
import {Permission} from "../entities/Permission";
import {REQUEST} from "@nestjs/core";
import {CurrentOrgUnit} from "../../common/decorators/current-org-unit.decorator";

@Controller('/api/dashboard')
export class DashboardController {
  @Inject(REQUEST)
  req: any;

  @Get('/:path')
  @UseGuards(AccessTokenGuard)
  async getOwnerWidgets(
      @Param('path') path: string,
      @CurrentUser() current: User,
      @CurrentOrgUnit({headerOnly: true}) orgUnit: number
  ): Promise<any> {
    let where: any = {path: path, enable: true};
    if (![Role.Membership.toString(), Role.Contactor.toString()].includes(path)) {
      if (current?.groups && current?.groups?.length)
        where['group'] = In(current?.groups?.map(g => g.id));
      else
        where['group'] = 0;

      if (orgUnit)
        where['organizationUnit'] = orgUnit;
      else
        where['organizationUnit'] = 0;
    }
    let dashboards = await Dashboard.findBy(where);
    let groups: WorkGroup[];
    let orgUnits: OrganizationUnit[];
    if (dashboards && dashboards.filter(d => d.group > 0 || d.organizationUnit > 0).length > 0) {
      let groupIds = dashboards?.map(d => d.group).filter(g => g > 0);
      if (groupIds && groupIds.length > 0) {
        groups = await WorkGroup.findBy({id: In(groupIds)});
      }
      let orgUnitIds = dashboards?.map(d => d.organizationUnit).filter(g => g > 0);
      if (orgUnitIds && orgUnitIds.length > 0) {
        orgUnits = await OrganizationUnit.findBy({id: In(orgUnitIds)})
      }
    }
    return dashboards.map((d) => {
      let group = groups?.find((g) => g.id == d.group);
      let orgUnit = orgUnits?.find((g) => g.id == d.organizationUnit);
      return {
        group: d.group,
        groupTitle: group?.title,
        organizationUnit: d.organizationUnit,
        organizationUnitTitle: orgUnit?.title,
        enable: d.enable,
        path: d.path,
        widgets: d.widgets,
        updatedAt: d.updatedAt,
        updatedBy: d.updatedBy
      };
    });
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  async getList(@Query() params: any,
                @CurrentUser() current: User) {
    let where: any = {};
    if (!current?.roles?.includes(Role.Admin)) {
      let dashboardActions = await Permission.findOneBy({key: PermissionKey.DASHBOARD});
      if (!dashboardActions || !dashboardActions?.actions || !dashboardActions?.actions.length) {
        throw new ForbiddenException('Access denied');
      }
      if (!dashboardActions?.actions?.includes(PermissionAction.FULL)) {
        where['path'] = In(dashboardActions?.actions);
      }
      let orgUnit = +this.req.header(AppConstant.ORG_UNIT_HEADER_NAME);
      if (orgUnit) {
        where['organizationUnit'] = orgUnit;
      } else {
        if (current?.accessOrganizationUnits && current?.accessOrganizationUnits.length)
          where['organizationUnit'] = In(current?.accessOrganizationUnits?.map(g => g.id));
        else
          where['organizationUnit'] = 0;
      }
    }
    let dashboards = await Dashboard.find({
      where: where,
      relations: ['updatedBy'],
      cache: true,
    });
    let groupIds = dashboards?.map(d => d.group).filter(g => g > 0);
    let groups: WorkGroup[];
    if (groupIds && groupIds.length > 0) {
      groups = await WorkGroup.findBy({id: In(groupIds)});
    }
    let orgUnitIds = dashboards?.map(d => d.organizationUnit).filter(g => g > 0);
    let orgUnits: OrganizationUnit[];
    if (orgUnitIds && orgUnitIds.length > 0) {
      orgUnits = await OrganizationUnit.findBy({id: In(orgUnitIds)})
    }
    return dashboards.map((d) => {
      let group = groups?.find((g) => g.id == d.group);
      let orgUnit = orgUnits?.find((g) => g.id == d.organizationUnit);
      return {
        group: d.group,
        groupTitle: group?.title,
        organizationUnit: d.organizationUnit,
        organizationUnitTitle: orgUnit?.title,
        enable: d.enable,
        path: d.path,
        widgets: d.widgets,
        updatedAt: d.updatedAt,
        updatedBy: d.updatedBy
      };
    });
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  async save(
      @Body() model: Dashboard,
      @CurrentUser() current: User,
  ) {
    if (!hasAnyPermissions(current, [
      ...common_permissions,
      PermissionKey.DASHBOARD,
      `${PermissionKey.DASHBOARD}_${model.path}`
    ])) {
      throw new ForbiddenException('Access denied');
    }
    if (!model.path) {
      throw new BadRequestException('Invalid parameters');
    }
    let dashboard: Dashboard;
    if ([Role.Membership.toString(), Role.Contactor.toString()].includes(model.path)) {
      dashboard = await Dashboard.findOneBy({group: 0, organizationUnit: 0, path: model.path});
      if (!dashboard) {
        dashboard = new Dashboard();
        dashboard.enable = true;
        dashboard.group = 0;
        dashboard.organizationUnit = 0;
        dashboard.path = model.path;
      }
    } else {
      if (!model.group) {
        throw new BadRequestException('Invalid group');
      }
      let group = await WorkGroup.findOneBy({id: model.group});
      if (!group) {
        throw new BadRequestException('Invalid group');
      }
      // if (!model.organizationUnit) {
      //   model.organizationUnit = +this.req.header(AppConstant.ORG_UNIT_HEADER_NAME);
      //   // if (!model.organizationUnit) {
      //   //   throw new BadRequestException('Invalid organization unit');
      //   // }
      // }
      if (!model.organizationUnit && !current?.roles?.includes(Role.Admin)) {
        throw new BadRequestException('Invalid organization unit');
      }
      if (model.organizationUnit && !(current?.roles?.includes(Role.Admin) || current?.accessOrganizationUnits?.findIndex(u =>
          u.id == model.organizationUnit) >= 0)) {
        throw new BadRequestException('Invalid organization unit');
      }
      if (model.organizationUnit) {
        let orgUnit = await OrganizationUnit.findOneBy({id: model.organizationUnit});
        if (!orgUnit) {
          throw new BadRequestException('Invalid organization unit');
        }
      } else {
        model.organizationUnit = 0;
      }
      dashboard = await Dashboard.findOneBy({
        group: model.group,
        organizationUnit: model.organizationUnit,
        path: model.path
      });
      if (!dashboard) {
        dashboard = new Dashboard();
        dashboard.enable = true;
        dashboard.group = model.group;
        dashboard.organizationUnit = model.organizationUnit;
        dashboard.path = model.path;
      }
    }
    dashboard.widgets = model.widgets;
    dashboard.enable = model.enable;
    dashboard.updatedBy = current;
    try {
      let result = await Dashboard.save(dashboard);
      return result.widgets;
    } catch (e) {
      throw new InternalServerErrorException(e.message);
    }
  }
}
