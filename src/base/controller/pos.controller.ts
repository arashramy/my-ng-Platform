import {BadRequestException, Controller} from '@nestjs/common';
import {BaseController} from '../../common/controller/base.controller';
import {PermissionAction, PermissionKey,} from '../../common/constant/auth.constant';
import {PosDevice} from "../entities/PosDevice";
import {Bank} from "../entities/Bank";
import {PosService} from "../service/pos.service";
import {User} from "../entities/User";
import {UpdateResult} from "typeorm/query-builder/result/UpdateResult";

@Controller('/api/pos')
export class PosController extends BaseController<PosDevice> {
  constructor(private posService: PosService) {
    super(PosDevice, PermissionKey.BASE_POS);
  }

  additionalPermissions(): any[] {
    return [
      PermissionKey.BASE_BANK,
      `${PermissionKey.BASE_BANK}_${PermissionAction.UPDATE}`,
      `${PermissionKey.BASE_BANK}_${PermissionAction.CREATE}`,
      PermissionKey.AUTOMATION_OPT_ORDERS,
      PermissionKey.AUTOMATION_OPT_RECEPTION,
      PermissionKey.AUTOMATION_OPT_SECONDARY_SERVICE,
      `${PermissionKey.AUTOMATION_OPT_ORDERS}_${PermissionAction.SETTLE}`,
      `${PermissionKey.AUTOMATION_OPT_RECEPTION}_${PermissionAction.SETTLE}`,
      `${PermissionKey.AUTOMATION_OPT_SECONDARY_SERVICE}_${PermissionAction.CREATE}`,
      `${PermissionKey.AUTOMATION_OPT_SECONDARY_SERVICE}_${PermissionAction.UPDATE}`,
      `${PermissionKey.AUTOMATION_OPT_TRANSACTIONS}_${PermissionAction.READ}`,
      `${PermissionKey.AUTOMATION_OPT_TRANSACTIONS}_${PermissionAction.DEPOSIT}`,
      `${PermissionKey.AUTOMATION_OPT_TRANSACTIONS}_${PermissionAction.SETTLE}`,
    ];
  }

  async postEdit(model: PosDevice, entity: PosDevice, current: User): Promise<PosDevice> {
    this.posService.set(entity.id, entity);
    return super.postEdit(model, entity, current);
  }

  async postDelete(id: number[] | number, result: UpdateResult, current: User): Promise<boolean> {
    if (result.affected > 0) {
      if (Array.isArray(id)) {
        for (let i of id) {
          this.posService.del(i);
        }
      } else {
        this.posService.del(id);
      }
    }

    return super.postDelete(id, result, current);
  }

  async prepareDelete(id: number | number[]): Promise<void> {
    const banks = await Bank.count({
      where: {pos: {id: id as number}},
    });
    if (banks > 0)
      throw new BadRequestException(
          'You Cant Delete Pos device When Use in banks',
      );
  }
}
