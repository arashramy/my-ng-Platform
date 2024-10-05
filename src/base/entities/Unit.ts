import { Column, Entity, Like } from 'typeorm';
import { GlobalFilter } from '../../common/decorators/mvc.decorator';
import { IsNotEmpty } from 'class-validator';
import { UniqueValidate } from '../../common/validators/unique.validator';
import { CoreEntity } from './CoreEntity';
import { ApiProperty } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';

@Audit()
@Entity({ name: '_unit' })
export class Unit extends CoreEntity {
  @IsNotEmpty()
  @UniqueValidate(Unit)
  @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  @Column({ name: 'title' })
  @ApiProperty()
  title?: string = '';
}
