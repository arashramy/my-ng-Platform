import { User } from '../../base/entities/User';
import { ImageHubType } from '../image-hub.module';

export class ImageHubProcessEvent {
  user: User;
  createdBy: User;
  callerCode: string;
  status: string;
  type: ImageHubType;
  mode: string;
}
