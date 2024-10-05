import { BaseController } from '../../../common/controller/base.controller';
import { PermissionKey } from '../../../common/constant/auth.constant';
import { BadRequestException, Controller } from '@nestjs/common';
import { Project } from '../entities/Project';
import { User } from '../../../base/entities/User';

@Controller('/api/mps/project')
export class ProjectController extends BaseController<Project> {
  constructor() {
    super(Project, PermissionKey.MPS_OPERATIONAL_PROJECT);
  }

  additionalPermissions(): string[] {
    return [];
  }

  async prepareCreate(model: Project, current: User): Promise<Project> {
    const entity = await super.prepareCreate(model, current);
    const legalCustomer = await User.findOne({
      where: { id: model.legalCustomer as any, isLegal: true }
    });
    if (!legalCustomer) throw new BadRequestException('invalid legal customer');
    return entity;
  }
}
