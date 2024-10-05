import {BadRequestException, Controller} from '@nestjs/common';
import {BaseController} from '../../common/controller/base.controller';
import {PermissionKey,} from '../../common/constant/auth.constant';
import {Unit} from "../entities/Unit";
import {Product} from "../../automation/base/entities/Product";

@Controller('/api/unit')
export class UnitController extends BaseController<Unit> {
  constructor() {
    super(Unit, PermissionKey.BASE_UNIT);
  }

  additionalPermissions(): any[] {
    return [];
  }

  async prepareDelete(id: number | number[]): Promise<void> {
    const transactions = await Product.count({
      where: {unit: {id: id as number}},
    });
    if (transactions > 0)
      throw new BadRequestException(
          'You Cant Delete Unit When Use in Products',
      );
  }
}
