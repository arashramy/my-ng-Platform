import {Controller} from '@nestjs/common';
import {PermissionKey} from '../../../common/constant/auth.constant';
import {WalletGift} from '../entities/WalletGift';
import {BaseController} from '../../../common/controller/base.controller';

@Controller('/api/wallet/gift')
export class WalletGiftController extends BaseController<WalletGift> {
  constructor() {
    super(WalletGift, PermissionKey.AUTOMATION_BASE_WALLET_GIFT);
  }

  additionalPermissions(): string[] {
    return [];
  }
}
