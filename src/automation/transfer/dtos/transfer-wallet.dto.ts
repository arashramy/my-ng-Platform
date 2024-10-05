import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class TransferWalletDTO {
  @IsNotEmpty()
  @IsNumber()
  user: number;

  @IsNumber()
  @IsNotEmpty()
  credit: number;

  @IsNotEmpty()
  @IsString()
  submitedAt: string;
}
