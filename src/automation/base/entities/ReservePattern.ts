import { jsonTransformer } from '../../../common/typeorm/converter/json-transformer';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ReserveTag } from './ReserveTag';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional
} from 'class-validator';
import { Gender } from '../../../base/entities/User';
import { Relation } from '../../../common/decorators/mvc.decorator';
import { Product } from './Product';

@Relation({ findAll: ['reservationTag'], autoComplete: ['reservationTag'] })
@Entity({ name: '_reserve_pattern' })
export class ReservePattern extends CoreEntity {
  @OneToMany(() => Product, (product) => product.reservationPattern)
  products: Product[];

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'is_active', nullable: true, type: 'boolean' })
  isActive: boolean;

  @ManyToOne(() => ReserveTag)
  @JoinColumn({ name: 'tagId', referencedColumnName: 'id' })
  reservationTag: ReserveTag;

  @Column({
    name: 'items',
    nullable: true,
    type: 'text',
    transformer: jsonTransformer
  })
  items: ReservePatternItems[];

  @Column({ name: 'auto_calculates' })
  autoCalculate?: boolean;
}

export class ReservePatternItems {
  @IsNotEmpty()
  @IsString()
  fromTime: string;

  @IsNotEmpty()
  @IsString()
  toTime: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsNumber()
  tax: number;

  @IsBoolean()
  isActive: boolean;

  @IsNotEmpty()
  // @IsEnum(Gender)
  gender?: Gender;

  @IsNotEmpty()
  @IsBoolean()
  day1: boolean;

  @IsNotEmpty()
  @IsBoolean()
  day2: boolean;

  @IsNotEmpty()
  @IsBoolean()
  day3: boolean;

  @IsNotEmpty()
  @IsBoolean()
  day4: boolean;

  @IsNotEmpty()
  @IsBoolean()
  day5: boolean;

  @IsNotEmpty()
  @IsBoolean()
  day6: boolean;

  @IsNotEmpty()
  @IsBoolean()
  day7: boolean;

  @IsString()
  @IsOptional()
  fromDate?: string;

  @IsString()
  @IsOptional()
  toDate?: string;
}
