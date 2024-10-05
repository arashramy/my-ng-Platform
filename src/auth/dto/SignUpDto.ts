import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString
} from 'class-validator';
import { Gender } from '../../base/entities/User';

export class SignUpDto {
  @IsNotEmpty({ message: 'Firstname is required' })
  firstName?: string;
  @IsNotEmpty({ message: 'Lastname is required' })
  lastName?: string;
  @IsOptional({ message: 'Mobile number is required' })
  @IsPhoneNumber('IR', { message: 'Mobile number is not valid' })
  mobile?: string;
  @IsOptional()
  @IsEmail()
  email?: string;
  @IsNotEmpty({ message: 'Password is required' })
  password?: string;
  gender?: Gender;
}
