import { Column, Entity, Like } from 'typeorm';
import { CoreEntity } from './CoreEntity';
import { GlobalFilter, Relation } from '../../common/decorators/mvc.decorator';
import { UniqueValidate } from '../../common/validators/unique.validator';
import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';

@Audit()
@Relation({
  findAll: [],
  get: [],
  autoComplete: []
})
@Entity({ name: '_province', schema: 'public' })
export class Province extends CoreEntity {
  @IsNotEmpty()
  @UniqueValidate(Province)
  @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  @Column({ name: 'title' })
  @ApiProperty({ type: String })
  title?: string = '';

  @Column({ name: 'pre_code' })
  @ApiProperty({ type: String, nullable: true })
  preCode?: string;
}
