import { CoreEntity } from '../../../../base/entities/CoreEntity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { AccountingFloating } from './floating.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: '_accounting_floating_item', schema: 'public' })
export class AccountingFloatingItem extends CoreEntity {
  @Column('varchar', { name: 'code' })
  @ApiProperty()
  code: string;

  @Column('varchar', { name: 'name' })
  @ApiProperty()
  name: string;

  @ManyToOne(() => AccountingFloating, (floating) => floating.id)
  @ApiProperty({ type: () => AccountingFloating })
  floating: AccountingFloating;
}
