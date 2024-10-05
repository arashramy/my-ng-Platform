import {Image} from "../../../base/dto/image.dto";
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';
import {ProductCategory} from "../entities/ProductCategory";

export interface SaleUnitsCategoryDto {
    id: number;
    title?: string;
    types: SaleUnitType[];
    image?: Image;
    categories?: ProductCategory[];
}