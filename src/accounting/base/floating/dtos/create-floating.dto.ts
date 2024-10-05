import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { FloatingType } from '../entities/floating.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFloatingDTO {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  name: string;

  @IsNotEmpty()
  @IsArray()
  @ApiProperty({ type: [Number] })
  @IsNumber({}, { each: true })
  codings: number[];

  @IsNotEmpty()
  @ApiProperty({ enum: FloatingType })
  @IsEnum(FloatingType)
  type: FloatingType;
}
