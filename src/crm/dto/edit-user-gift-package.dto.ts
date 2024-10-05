import { IsArray, IsInt, IsNotEmpty } from 'class-validator';
import { GiftPackage, GiftPackageFilter } from '../entities/GiftPackage';
import { OrganizationUnit } from '../../base/entities/OrganizationUnit';
import { SaleUnit,  } from '../../base/entities/SaleUnit';
import { FiscalYear } from '../../base/entities/FiscalYears';
import { ProductPrice } from '../../automation/base/entities/ProductPrice';
import { User } from '../../base/entities/User';
import { SaleUnitType } from '../../automation/operational/entities/SaleItem';


export class EditUserGiftPackageDTO {
  @IsNotEmpty()
  @IsInt()
  id: number;

  @IsNotEmpty()
  @IsArray()
  @IsInt({ each: true })
  usersId: number[];

  @IsNotEmpty()
  filter: GiftPackageFilter;
}

export class EditUserGiftPackageProcessorDTO {
  id: number;
  usersId: number[];
  giftPackage: GiftPackage;
  orgUnitId: number;
  orgUnit: OrganizationUnit;
  saleUnit: SaleUnit;
  fiscalYear: FiscalYear;
  productPrice: ProductPrice;
  saleUnitType: SaleUnitType;
  currentUser: User;
}
