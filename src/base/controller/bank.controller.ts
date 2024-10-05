import { BadRequestException, Controller } from '@nestjs/common';
import { Bank } from '../entities/Bank';
import { BaseController } from '../../common/controller/base.controller';
import {
  PermissionAction,
  PermissionKey
} from '../../common/constant/auth.constant';
import { Transaction } from '../../automation/operational/entities/Transaction';

@Controller('/api/bank')
export class BankController extends BaseController<Bank> {
  constructor() {
    super(Bank, PermissionKey.BASE_BANK);
  }

  additionalPermissions(): any[] {
    return [
      PermissionKey.AUTOMATION_OPT_ORDERS,
      PermissionKey.AUTOMATION_OPT_RECEPTION,
      PermissionKey.AUTOMATION_OPT_SECONDARY_SERVICE,
      `${PermissionKey.AUTOMATION_OPT_ORDERS}_${PermissionAction.SETTLE}`,
      `${PermissionKey.AUTOMATION_OPT_RECEPTION}_${PermissionAction.SETTLE}`,
      `${PermissionKey.AUTOMATION_OPT_SECONDARY_SERVICE}_${PermissionAction.CREATE}`,
      `${PermissionKey.AUTOMATION_OPT_SECONDARY_SERVICE}_${PermissionAction.UPDATE}`,
      `${PermissionKey.AUTOMATION_OPT_TRANSACTIONS}_${PermissionAction.READ}`,
      `${PermissionKey.AUTOMATION_OPT_TRANSACTIONS}_${PermissionAction.DEPOSIT}`,
      `${PermissionKey.AUTOMATION_OPT_TRANSACTIONS}_${PermissionAction.SETTLE}`
    ];
  }

  async prepareDelete(id: number | number[]): Promise<void> {
    const transactions = await Transaction.count({
      where: { source: id as number }
    });
    if (transactions > 0)
      throw new BadRequestException(
        'You Cant Delete Bank When Use in Transactions'
      );
  }
}
