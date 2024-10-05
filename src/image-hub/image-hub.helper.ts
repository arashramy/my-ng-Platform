import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from '../base/entities/User';
import { EventsConstant } from '../common/constant/events.constant';
import { ImageHubType } from './image-hub.module';

@Injectable()
export class ImageHubHelper {
  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;

  doneUploading(
    usr: User,
    callerCode: string,
    status: 'FAILED' | 'SUCCESSED',
    type: ImageHubType,
    mode: string
  ) {
    return this.eventEmitter.emit(
      EventsConstant.UPLOADING_IDENTIFICATION_PROVIDER,
      {
        user: usr,
        createdBy: usr.createdBy,
        callerCode,
        status,
        type,
        mode
      }
    );
  }
}
