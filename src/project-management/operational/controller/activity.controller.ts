import { BaseController } from '../../../common/controller/base.controller';
import { PermissionKey } from '../../../common/constant/auth.constant';
import { Controller } from '@nestjs/common';
import { Activity } from '../entities/Activity';
import { User } from '../../../base/entities/User';
import { AppConstant } from '../../../common/constant/app.constant';
import moment from 'moment';

@Controller('/api/mps/activity')
export class ActivityController extends BaseController<Activity> {
  constructor() {
    super(Activity, PermissionKey.MPS_OPERATIONAL_ACTIVITY);
  }

  additionalPermissions(): string[] {
    return [];
  }

  async prepareCreate(model: Activity, current: User): Promise<Activity> {
    let entity = await super.prepareCreate(model, current);
    const date = moment(model.date, AppConstant.SUBMIT_TIME_FORMAT);
    entity.date = date.toDate();
    return entity;
  }
}
