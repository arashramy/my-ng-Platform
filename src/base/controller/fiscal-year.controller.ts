import {Controller, Get, UseGuards} from '@nestjs/common';
import {BaseController} from "../../common/controller/base.controller";
import {PermissionKey} from "../../common/constant/auth.constant";
import {FiscalYear} from "../entities/FiscalYears";
import {JwtUser} from "../../auth/decorators/jwt-user.decorator";
import {JwtPayload} from "../../auth/dto/JwtPayload";
import {In} from "typeorm";
import {AccessTokenGuard} from "../../auth/guard/access-token.guard";

@Controller('/api/fiscal-year')
export class FiscalYearController extends BaseController<FiscalYear> {
  constructor() {
    super(FiscalYear, PermissionKey.BASE_FISCAL_YEAR)
  }

  @Get("/owner")
  @UseGuards(AccessTokenGuard)
  getOwner(@JwtUser() user: JwtPayload) {
    return FiscalYear.find({where: {id: In(user.accessFiscalYears || [])}});
  }

  additionalPermissions(): string[] {
    return [];
  }
}
