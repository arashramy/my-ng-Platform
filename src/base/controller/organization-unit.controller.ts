import {Controller, Get, Param, Res, UseGuards} from '@nestjs/common';
import {BaseController} from "../../common/controller/base.controller";
import {PermissionKey} from "../../common/constant/auth.constant";
import {OrganizationUnit} from "../entities/OrganizationUnit";
import {In} from "typeorm";
import {JwtUser} from "../../auth/decorators/jwt-user.decorator";
import {JwtPayload} from "../../auth/dto/JwtPayload";
import {AccessTokenGuard} from "../../auth/guard/access-token.guard";
import {Request} from "express";
import {CurrentUser} from "../../auth/decorators/current-user.decorator";
import {Role, User} from "../entities/User";
import {AppConstant} from "../../common/constant/app.constant";
import {Dashboard} from "../entities/Dashboard";
import {WorkGroup} from "../entities/WorkGroup";

@Controller('/api/organization-unit')
export class OrganizationUnitController extends BaseController<OrganizationUnit> {
  constructor() {
    super(OrganizationUnit, PermissionKey.BASE_ORGANIZATION_UNIT)
  }


  @Get("/owner")
  @UseGuards(AccessTokenGuard)
  getOwner(@JwtUser() user: JwtPayload) {
    return OrganizationUnit.find({where: {id: In(user.accessOrganizationUnits || [])}});
  }


  additionalPermissions(): string[] {
    return [];
  }
}
