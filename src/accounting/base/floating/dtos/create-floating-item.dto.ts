import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateFloatingItemDTO {
  @IsNotEmpty()
  @IsInt()
  @ApiProperty()
  floating: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  code: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name: string;
}
