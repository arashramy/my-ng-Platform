import { JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { CoreEntity } from './CoreEntity';
import { FiscalYear } from './FiscalYears';
import { FiscalYearFilter } from '../../common/decorators/mvc.decorator';
import { ApiProperty } from '@nestjs/swagger';

export abstract class FiscalYearBaseEntity extends CoreEntity {
  @FiscalYearFilter()
  @ManyToOne(() => FiscalYear)
  @JoinColumn({ name: 'fiscal_year' })
  @ApiProperty({ type: () => FiscalYear })
  fiscalYear?: FiscalYear;
  @RelationId((object: FiscalYearBaseEntity) => object.fiscalYear)
  @ApiProperty({ type: Number })
  fiscalYearId?: number;
}
