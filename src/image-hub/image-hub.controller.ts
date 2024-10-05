import {
  Body,
  Controller,
  Inject,
  Param,
  ParseIntPipe,
  Post
} from '@nestjs/common';
import { BaseController } from '../common/controller/base.controller';
import { ImageHubLog } from './image-hub-log.entity';
import { PermissionKey } from '../common/constant/auth.constant';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../common/constant/events.constant';
import { UpdateHubDTO } from './dtos/update-hub.dto';

@Controller('/api/image-hub')
export class ImageHubController extends BaseController<ImageHubLog> {
  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;

  constructor() {
    super(ImageHubLog, PermissionKey.BASE_IMAGE_HUB_LOG);
  }

  @Post()
  async updateUserHub(@Body() { mode, user }: UpdateHubDTO) {
    this.eventEmitter.emit(EventsConstant.IMAGE_HUB_UPLOADER, {
      data: user,
      mode
    });
    return { message: 'Update Processing Started ...' };
  }

  additionalPermissions(): string[] {
    return [];
  }
}
