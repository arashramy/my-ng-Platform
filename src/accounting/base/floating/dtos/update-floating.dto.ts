import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateFloatingDTO } from './create-floating.dto';

export class UpdateFloatingDTO extends PartialType(
  PickType(CreateFloatingDTO, ['name', 'codings']),
) {}
