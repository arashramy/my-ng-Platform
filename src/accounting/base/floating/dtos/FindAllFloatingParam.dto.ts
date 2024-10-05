import { IsEnum, IsNotEmpty } from 'class-validator';
import { FloatingType } from '../entities/floating.entity';

export class FindAllFloatingParamDTO {
  @IsNotEmpty()
  @IsEnum(FloatingType)
  type: FloatingType;
}
