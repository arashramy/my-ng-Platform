import { BadRequestException, Controller } from '@nestjs/common';
import {
  PermissionAction,
  PermissionKey
} from '../../../common/constant/auth.constant';
import { BaseController } from '../../../common/controller/base.controller';
import { Loan } from '../entities/Loan';
import { User } from '../../../base/entities/User';
import { UserLoan } from '../../../automation/operational/entities/UserLoan';

@Controller('/api/loan')
export class LoanController extends BaseController<Loan> {
  constructor() {
    super(Loan, PermissionKey.AUTOMATION_BASE_LOAN);
  }

  queryPaging(): 'take' | 'offset' {
    return 'offset';
  }

  findAllPaging(): 'take' | 'offset' {
    return 'offset';
  }

  async prepareDelete(id: number | number[], current: User): Promise<void> {
    const userLoan = await UserLoan.findOne({
      where: { loanId: id as number },
      relations: ['loan']
    });
    if (userLoan) {
      throw new BadRequestException(
        'this loan have user loan. and can not delete'
      );
    }
  }

  additionalPermissions(): any[] {
    return [
      PermissionKey.AUTOMATION_OPT_MEMBERSHIP,
      `${PermissionKey.AUTOMATION_OPT_MEMBERSHIP}_${PermissionAction.READ}`,
      `${PermissionKey.AUTOMATION_OPT_MEMBERSHIP}_${PermissionAction.CREATE}`,
      `${PermissionKey.AUTOMATION_OPT_MEMBERSHIP}_${PermissionAction.UPDATE}`
    ];
  }
}
