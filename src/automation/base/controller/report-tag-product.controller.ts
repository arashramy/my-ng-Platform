import { BaseController } from '../../../common/controller/base.controller';
import { ProductTag } from '../entities/ProductTag';
import { PermissionKey } from '../../../common/constant/auth.constant';
import { Controller } from '@nestjs/common';

@Controller('/api/report-tag-product')
export class ReportTagProductController extends BaseController<ProductTag> {
  constructor() {
    super(ProductTag, PermissionKey.AUTOMATION_REPORT_TAG_PRODUCT);
  }

  additionalPermissions(): string[] {
    return [];
  }
}
