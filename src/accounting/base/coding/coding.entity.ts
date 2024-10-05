import { ApiProperty } from '@nestjs/swagger';
import { FiscalYearBaseEntity } from '../../../base/entities/FiscalYearBaseEntity';
import { Column, Entity, Tree, TreeChildren, TreeParent } from 'typeorm';

export enum CodingGroupType {
  Balance = 'Balance',
  CostBenefit = 'CostBenefit',
  Useless = 'Useless',
}

export enum CodingType {
  Total = 'Total',
  Specefied = 'Specefied',
  Preference = 'Preference',
  Group = 'Group',
}

@Tree('closure-table', { closureTableName: '_accounting_tree' })
@Entity({ name: '_account_coding', orderBy: { id: 'ASC' }, schema: 'public' })
export class AccountingCoding extends FiscalYearBaseEntity {
  @Column('varchar', { name: 'coding' })
  @ApiProperty()
  coding: string;

  @Column('varchar', { name: 'name' })
  @ApiProperty()
  name: string;

  @Column('varchar', {
    name: 'accounting_type',
    nullable: true,
  })
  @ApiProperty({ enum: CodingGroupType })
  codingGroupType?: CodingGroupType;

  @Column('varchar', { name: 'coding_type'})
  @ApiProperty({ enum: CodingType })
  codingType: CodingType;

  @TreeParent()
  parent?: AccountingCoding;

  @TreeChildren()
  children?: AccountingCoding[];
}
