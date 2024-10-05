import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class UpdateCodingDTO {
  @IsOptional()
  @IsNumberString()
  @ApiProperty({ nullable: true })
  coding?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ nullable: true })
  name?: string;
}

