import { Column, Entity, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { CoreEntity } from '../../../../base/entities/CoreEntity';
import { AccountingCoding } from '../../coding/coding.entity';
import { AccountingFloatingItem } from './floating-item.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum FloatingType {
  User = 'User',
  PriceCenter = 'PriceCenter',
  Project = 'Project',
  Currency = 'Currency',
}

@Entity({ name: '_floating', schema: 'public' })
export class AccountingFloating extends CoreEntity {
  @Column('varchar', { name: 'name' })
  @ApiProperty()
  name: string;

  @Column('enum', { name: 'type', enum: FloatingType })
  @ApiProperty({ enum: FloatingType })
  type: FloatingType;

  @ManyToMany(() => AccountingCoding)
  @JoinTable()
  @ApiProperty({ type: () => AccountingCoding, isArray: true })
  codings: AccountingCoding[];

  @OneToMany(() => AccountingFloatingItem, (item) => item.floating)
  @ApiProperty({ type: () => AccountingFloatingItem })
  items: AccountingFloatingItem;
}
