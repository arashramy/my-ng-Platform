import { User } from '../base/entities/User';

export abstract class ImageHubAbstractService {
  abstract upload(usr: User, mode: string): Promise<boolean>;
}
