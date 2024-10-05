import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AuthDto {
  @IsNotEmpty({ message: 'Username is required' })
  @IsString()
  username: string;
  @IsOptional()
  password: string;
}
