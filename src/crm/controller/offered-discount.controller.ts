import {Controller, Get, Query} from '@nestjs/common';
import {PermissionAction, PermissionKey,} from '../../common/constant/auth.constant';
import {BaseController} from '../../common/controller/base.controller';
import {OfferedDiscount} from "../entities/OfferedDiscount";
import moment from "moment";
import {AppConstant} from "../../common/constant/app.constant";
import {DiscountService} from "../service/discount.service";

@Controller('/api/discount')
export class OfferedDiscountController extends BaseController<OfferedDiscount> {
  constructor(private discountService: DiscountService) {
    super(OfferedDiscount, PermissionKey.CRM_OPT_DISCOUNT);
  }

  @Get("inquiry")
  async inquiryDiscount(@Query('user') user: number,
                        @Query('code') code?: string,
                        @Query('organizationUnit') orgUnit?: number,
                        @Query('saleUnits') saleUnits?: string,
                        @Query('products') products?: string,
                        @Query('submitAt') submitAt?: string,
                        @Query('transactions') transactions?: string,
                        @Query('saleItems') saleItems?: string) {
    return this.discountService.findBy(code, user, orgUnit, saleUnits,
        products, submitAt ? moment(submitAt, AppConstant.SUBMIT_TIME_FORMAT).toDate() : new Date(),
        transactions, saleItems);
  }

  additionalPermissions(): any[] {
    return [
      PermissionKey.AUTOMATION_OPT_MEMBERSHIP,
      `${PermissionKey.AUTOMATION_OPT_MEMBERSHIP}_${PermissionAction.READ}`,
      `${PermissionKey.AUTOMATION_OPT_MEMBERSHIP}_${PermissionAction.CREATE}`,
      `${PermissionKey.AUTOMATION_OPT_MEMBERSHIP}_${PermissionAction.UPDATE}`,
    ];
  }
}
