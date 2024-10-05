import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsConstant } from '../../common/constant/events.constant';
import { ImageHubProcessEvent } from '../types/image-hub.type';
import { ImageHubLog } from '../image-hub-log.entity';

@Injectable()
export class ImageHubProcessingEvent {
  @OnEvent(EventsConstant.UPLOADING_IDENTIFICATION_PROVIDER)
  async handleUploadingEvent(data: ImageHubProcessEvent) {
    const imageHubLog = new ImageHubLog();
    if (data.callerCode) {
      imageHubLog.callerCode = data.callerCode;
    }
    imageHubLog.createdBy = data.createdBy;
    imageHubLog.user = data.user;
    imageHubLog.type = data.type;
    imageHubLog.status = data.status;
    imageHubLog.mode = data.mode;
    await imageHubLog.save();
  }
}
