import { IsNotEmpty, IsString } from 'class-validator';
import { User } from '../../base/entities/User';

export class UpdateHubDTO {
  @IsNotEmpty()
  user: User;

  @IsNotEmpty()
  @IsString()
  mode: string;
}
