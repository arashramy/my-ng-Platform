import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from './guard/access-token.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../base/entities/User';
import { ChangePasswordDto } from './dto/ChangePasswordDto';
import { HashHelper } from '../common/helper/hash.helper';
import { UsersService } from './service/users.service';
import { JwtUser } from './decorators/jwt-user.decorator';
import { JwtPayload } from './dto/JwtPayload';
import { InjectUserToBody } from '../common/decorators/inject-user.decorator';

@UseGuards(AccessTokenGuard)
@Controller('/api/auth')
export class ProfileController {
  constructor(private usersService: UsersService) {}

  @Get('/profile')
  async getProfile(@CurrentUser() current: User) {
    return this.usersService.get(current.id, 'id', [
      'groups',
      'introductionMethod',
      'accessShops',
      'accessOrganizationUnits',
      'accessShops.lockerLocation'
    ]);
  }

  @Post('/update-avatar')
  async uploadAvatar(@Body() image: any, @CurrentUser() current: User) {
    await this.usersService.update(current.id, {
      profile: image,
      updatedBy: current
    });
    return true;
  }

  @Post('/update-config')
  async uploadConfig(@Body() config: any, @CurrentUser() current: User) {
    await this.usersService.update(current.id, {
      config: config,
      updatedBy: current
    });
    return true;
  }

  @InjectUserToBody()
  @Post('/update-password')
  async uploadPassword(
    @Body() request: ChangePasswordDto,
    @JwtUser() current: JwtPayload
  ) {
    let password = await HashHelper.hash(request.password);
    await this.usersService.update(current.sub, {
      forceChangePassword: false,
      password: password
    });
    return true;
  }
}
