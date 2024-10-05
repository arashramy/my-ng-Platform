import { Controller, Inject, Post } from '@nestjs/common';
import { UserActivityService } from '../service/user-activity.service';

@Controller('/api/user-activity')
export class UserActivityController {
  @Inject(UserActivityService)
  private readonly userActivityService: UserActivityService;

  @Post()
  calculateUserActivity() {
    return this.userActivityService.checkUserActivity();
  }
}
