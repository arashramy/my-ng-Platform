import {Product} from '../entities/Product';
import {BadRequestException, Controller, Get, Param, Query} from '@nestjs/common';
import {PermissionAction, PermissionKey,} from '../../../common/constant/auth.constant';
import {ProductCategory, ProductType} from '../entities/ProductCategory';
import {BaseController} from '../../../common/controller/base.controller';
import {In} from "typeorm";
import {CurrentUser} from "../../../auth/decorators/current-user.decorator";
import {User} from "../../../base/entities/User";
import {SaleUnitService} from "../../../base/service/sale-unit.service";

@Controller('/api/product-category')
export class ProductCategoryController extends BaseController<ProductCategory> {
  constructor(private saleUnitService: SaleUnitService) {
    super(ProductCategory, PermissionKey.AUTOMATION_BASE_PRODUCT_CATEGORY);
  }

  @Get("/category/:id")
  async getCategoryList(@Param("id") id: number,
                        @Query('type') type: ProductType = ProductType.Product,
                        @CurrentUser() user: User) {
    if (!user.isAdmin()) {
      if (!user.accessShops?.find(s => s.id == id)) {
        return [];
      }
    }
    return this.saleUnitService.getCategoryByShopId(id, type);
  }

  additionalPermissions(): any[] {
    return [
      PermissionKey.AUTOMATION_BASE_PRODUCT,
      `${PermissionKey.AUTOMATION_BASE_PRODUCT}_${PermissionAction.READ}`,
      `${PermissionKey.AUTOMATION_BASE_PRODUCT}_${PermissionAction.CREATE}`,
      `${PermissionKey.AUTOMATION_BASE_PRODUCT}_${PermissionAction.UPDATE}`,
    ];
  }

  async prepareDelete(id: number | number[]): Promise<void> {
    const product = await Product.count({
      where: {category: {id: Array.isArray(id) ? In(id) : id}},
    });
    if (product > 0) {
      throw new BadRequestException(
          'you cant delete category when use in product',
      );
    }
  }
}
