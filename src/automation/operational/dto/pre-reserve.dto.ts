import { IsNotEmpty } from 'class-validator';

export class PreReserveDTO {
  @IsNotEmpty()
  product: number;

  @IsNotEmpty()
  day: string;

  @IsNotEmpty()
  fromTime: string;

  @IsNotEmpty()
  toTime: string;

  @IsNotEmpty()
  gender: any;

  @IsNotEmpty()
  specificDate: string;
}
