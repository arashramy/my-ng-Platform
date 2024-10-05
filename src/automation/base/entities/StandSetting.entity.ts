import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { Relation } from '../../../common/decorators/mvc.decorator';
import { Audit } from '../../../common/decorators/audit.decorator';

@Audit()
@Relation({
  findAll: ['saleUnit', 'createdBy', 'updatedBy', 'deletedBy'],
  get: ['saleUnit', 'createdBy', 'updatedBy', 'deletedBy'],
})
@Entity({ name: '_stand_setting' })
export class StandSetting extends CoreEntity {
  @ManyToMany(() => SaleUnit)
  @JoinTable({
    name: 'sale_unit_stand_setting',
    joinColumn: {
      name: '_stand_setting',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: { name: '_sale_unit', referencedColumnName: 'id' },
  })
  @IsNotEmpty()
  @ApiProperty({ type: () => [SaleUnit] })
  saleUnit: SaleUnit[];

  @Column({ name: 'title', nullable: true, default: '' })
  @MinLength(3)
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  title?: string;

  @Column({ type: 'json', default: '{}' })
  @IsOptional()
  @IsObject()
  @ApiProperty({ type: Object })
  setting: { [key: string]: any };
}
