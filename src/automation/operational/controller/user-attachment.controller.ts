import { BaseController } from '../../../common/controller/base.controller';
import { UserFileAttachment } from '../entities/UserFileAttachment';
import { PermissionKey } from '../../../common/constant/auth.constant';
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UseGuards
} from '@nestjs/common';
import { createReadStream } from 'fs';
import { Response } from 'express';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../../auth/guard/access-token.guard';
import { User } from '../../../base/entities/User';

@Controller('/api/user-attachment')
export class UserAttachmentController extends BaseController<UserFileAttachment> {
  @Inject(ConfigService)
  private readonly configService: ConfigService;

  constructor() {
    super(UserFileAttachment, PermissionKey.AUTOMATION_USER_FILE_ATTACHMENT);
  }

  @Post('/user/add')
  @UseGuards(AccessTokenGuard)
  async customerAddAttachment(@Body() body: any, @CurrentUser() user: User) {
    return await UserFileAttachment.save(
      UserFileAttachment.create({ ...body, user, createdBy: user })
    );
  }

  @Get('/user')
  getCustomerAttachment(@CurrentUser() user: User) {
    return UserFileAttachment.find({
      where: { user: { id: user.id }, presentable: true },
      relations: { user: true, createdBy: true, updatedBy: true },
      order: { createdAt: -1 }
    });
  }

  @Get('/download/:id')
  async downloadBackupFile(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ) {
    const userAttachment = await UserFileAttachment.findOne({ where: { id } });
    if (!userAttachment) return;
    const readStream = createReadStream(
      join(this.configService.get<string>('MEDIA_PATH'), userAttachment.file)
    );
    readStream.pipe(res);
    return;
  }

  additionalPermissions(): string[] {
    return [];
  }
}
