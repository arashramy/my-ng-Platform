import {Controller, Get, Inject, Query} from '@nestjs/common';
import {SaleItemService} from "../service/sale-item.service";

@Controller('/api/shop-item')
export class ShopItemController {
  @Inject(SaleItemService)
  shopItemService: SaleItemService;

  @Get('shop')
  getShop() {
    // return this.shopItemService.getShop();
  }

  @Get('product')
  getProduct(@Query('category') category: number, @Query('shop') shop: number) {
    // return this.shopItemService.getProduct(category, shop);
  }

  @Get('category')
  getCategory(@Query('shop') shop: number) {
    // return this.shopItemService.getCategory(shop);
  }
}
