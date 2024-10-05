import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { LockerType } from '../../../automation/operational/entities/LockerItem';

export class UpdateLockerItemDTO {
  @IsOptional()
  @IsBoolean()
  status: boolean;

  @IsOptional()
  @IsEnum(LockerType)
  type: LockerType;
}
