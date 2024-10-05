import { PermissionKey } from '../../common/constant/auth.constant';
import { BaseController } from '../../common/controller/base.controller';
import { TransferType } from '../entities/TransferType';
import { Controller } from '@nestjs/common';
import { Role } from '../entities/User';

@Controller('/api/transfer/type')
export class TransferTypeController extends BaseController<TransferType> {
  constructor() {
    super(TransferType, PermissionKey.BASE_TRANSFER_TYPE);
  }

  

  additionalPermissions(): string[] {
    return [Role.User,Role.Membership];
  }
}
