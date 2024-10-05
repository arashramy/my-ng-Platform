import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';
import { UserActivityService } from '../service/user-activity.service';

@Injectable()
export class UserActivityListeners {
  constructor(private userActivityService: UserActivityService) {}

  @OnEvent(EventsConstant.USER_ACTIVITY)
  async userActivity() {
    this.userActivityService.checkUserActivity();
  }
}
