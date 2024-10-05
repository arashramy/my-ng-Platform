import { BaseController } from '../../../common/controller/base.controller';
import { PermissionKey } from '../../../common/constant/auth.constant';
import { Controller } from '@nestjs/common';
import { Position } from '../entities/Position';

@Controller('/api/mps/position')
export class PositionController extends BaseController<Position> {
  constructor() {
    super(Position, PermissionKey.MPS_BASE_POSITION);
  }

  additionalPermissions(): string[] {
    return [];
  }
}
