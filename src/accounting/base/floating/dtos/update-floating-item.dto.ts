import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateFloatingItemDTO {
  @IsOptional()
  @IsString()
  @ApiProperty()
  code?: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  name?: string;
}
