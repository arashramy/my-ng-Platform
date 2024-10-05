import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString
} from 'class-validator';
import { ProductType } from '../../automation/base/entities/ProductCategory';

export class CreateGiftPackageDTO {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsNumber()
  productId: number;

  @IsNotEmpty()
  @IsDate()
  startProductAt: Date;

  @IsNotEmpty()
  @IsInt()
  saleUnitId: number;

  @IsOptional()
  @IsInt()
  productPriceId: number;

  @IsOptional()
  giftType: ProductType;
}
