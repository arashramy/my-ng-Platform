import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { CodingGroupType, CodingType } from '../coding.entity';
import { ValidateCoding } from '../decorators/validate-coding.decorator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCoding {
  @IsNotEmpty()
  @IsNumberString()
  @ApiProperty()
  coding: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name: string;

  @IsOptional()
  @IsEnum(CodingGroupType)
  @ApiPropertyOptional({ enum: CodingGroupType })
  codingGroupType: CodingGroupType;

  @IsNotEmpty()
  @IsEnum(CodingType)
  @ValidateCoding()
  @ApiProperty({ enum: CodingType })
  codingType?: CodingType;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ type: Number })
  parentCoding?: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ type: Number, default: 1400 })
  fiscalYear: number;
}
