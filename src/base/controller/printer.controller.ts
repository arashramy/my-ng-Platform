import { Controller } from '@nestjs/common';
import { BaseController } from '../../common/controller/base.controller';
import { Printer } from '../entities/Printer';
import { PermissionKey } from '../../common/constant/auth.constant';

@Controller('/api/printer')
export class PrinterController extends BaseController<Printer> {
  constructor() {
    super(Printer, PermissionKey.BASE_PRINTER);
  }

  additionalPermissions(): string[] {
    return [];
  }
}
