import { BaseController } from '../../../common/controller/base.controller';
import { Task } from '../entities/Task';
import { PermissionKey } from '../../../common/constant/auth.constant';
import { Controller } from '@nestjs/common';

@Controller('/api/mps/task')
export class TaskController extends BaseController<Task> {
  constructor() {
    super(Task, PermissionKey.MPS_BASE_TASK);
  }

  additionalPermissions(): string[] {
    return [];
  }
}
