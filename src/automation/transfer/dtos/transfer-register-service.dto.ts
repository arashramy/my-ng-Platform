import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class TransferRegisterService {
  @IsNotEmpty()
  @IsNumber()
  user: number;

  @IsNotEmpty()
  @IsNumber()
  service: number;

  @IsNotEmpty()
  @IsString()
  submitedAt: string;

  @IsNotEmpty()
  @IsString()
  start: string;

  @IsNotEmpty()
  @IsString()
  end: string;

  @IsNotEmpty()
  @IsNumber()
  credit: number;

  @IsOptional()
  @IsNumber()
  contractor: number;
}
