import { PermissionKey } from "../../common/constant/auth.constant";
import { BaseController } from "../../common/controller/base.controller";
import { SmsTransaction } from "./sms-transaction";
import { Controller, UseGuards } from "@nestjs/common";
import { AccessTokenGuard } from "../../auth/guard/access-token.guard";

@UseGuards(AccessTokenGuard)
@Controller('/api/sms-transaction')
export class SmsTransactionController extends BaseController<SmsTransaction> {
    constructor() {
        super(SmsTransaction, PermissionKey.BASE_SMS_ACCOUNT)
    }

    additionalPermissions(): string[] {
        return []
    }
}