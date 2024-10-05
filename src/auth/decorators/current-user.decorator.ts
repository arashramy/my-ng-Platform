import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../base/entities/User';
import { JwtPayload } from '../dto/JwtPayload';
import { WorkGroup } from '../../base/entities/WorkGroup';
import { OrganizationUnit } from '../../base/entities/OrganizationUnit';
import { FiscalYear } from '../../base/entities/FiscalYears';
import { ShiftWork } from '../../base/entities/ShiftWork';
import { SaleUnit } from '../../base/entities/SaleUnit';
import { Bank } from '../../base/entities/Bank';

export const CurrentUser = createParamDecorator(
  async (
    options: {
      transient?: boolean;
      groups?: boolean;
      orgUnis?: boolean;
      years?: boolean;
      cache?: boolean;
    } = {
      transient: true,
      groups: false,
      orgUnis: false,
      years: false,
      cache: true
    },
    ctx: ExecutionContext
  ) => {
    const user: JwtPayload = ctx.switchToHttp().getRequest().user;
    if (!user) {
      return null;
    }
    if (options.transient) {
      const tempUser = new User();
      tempUser.id = user.sub;
      tempUser.mobile = user.username;
      tempUser.roles = user.roles;
      tempUser.permissions = user.permissions;
      tempUser.groups = user?.groups?.map((g) => {
        let group = new WorkGroup();
        group.id = g;
        return group;
      });
      tempUser.accessOrganizationUnits = user?.accessOrganizationUnits?.map(
        (g) => {
          let ou = new OrganizationUnit();
          ou.id = g;
          return ou;
        }
      );
      tempUser.accessFiscalYears = user?.accessFiscalYears?.map((g) => {
        let ou = new FiscalYear();
        ou.id = g;
        return ou;
      });
      tempUser.accessBanks = user?.accessBanks?.map((g) => {
        let ou = new Bank();
        ou.id = g;
        return ou;
      });
      tempUser.accessShops = user?.accessShops?.map((g) => {
        let ou = new SaleUnit();
        ou.id = g;
        return ou;
      });
      return tempUser;
    }
    let relations = [];
    if (options.groups) {
      relations.push('groups');
    }
    if (options.orgUnis) {
      relations.push('accessOrganizationUnits');
    }
    if (options.years) {
      relations.push('accessFiscalYears');
    }
    console.log('user sub', user);
    return await User.findOne({
      where: { id: user.sub },
      relations: relations,
      cache: options.cache == undefined ? true : options.cache
    }); // extract a specific property only if specified or get a user object
  }
);
