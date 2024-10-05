import { Column, Entity, Like } from 'typeorm';
import { Export } from '../../common/decorators/export.decorator';
import { CoreEntity } from './CoreEntity';
import { UniqueValidate } from '../../common/validators/unique.validator';
import { GlobalFilter } from '../../common/decorators/mvc.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { Audit } from '../../common/decorators/audit.decorator';

@Audit()
@Entity({ name: '_fiscal_year', schema: 'public' })
@Export<FiscalYear>({
  name: 'FiscalYear',
  translateKey: 'FISCAL_YEAR',
})
export class FiscalYear extends CoreEntity {
  @UniqueValidate(FiscalYear)
  @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  @Column({ name: 'fiscal_year' })
  @ApiProperty({ type: Number })
  year?: number;
  @Column({ name: 'start_date' })
  @ApiProperty({ type: Date })
  start?: Date;
  @Column({ name: 'end_date' })
  @ApiProperty({ type: Date })
  end?: Date;
}
