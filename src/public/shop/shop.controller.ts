import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpStatus
} from '@nestjs/common';
import { ShopService } from './shop.service';
import { SaleUnitService } from '../../base/service/sale-unit.service';
import { SaleOrderDto } from '../../automation/operational/dto/sale-order.dto';
import { User } from '../../base/entities/User';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SaleOrderService } from '../../automation/operational/service/sale-order.service';
import { ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductCategory } from '../../automation/base/entities/ProductCategory';
import { Location } from '../../base/entities/Location';
import { ShopGetProductResponseDTO } from './dto/shop-get-product.dto';

@ApiTags('shop')
@Controller('/api/shop')
export class ShopController {
  constructor(
    private readonly shopService: ShopService,
    private readonly saleUnitService: SaleUnitService,
    private readonly saleOrderService: SaleOrderService
  ) {}

  @ApiResponse({ status: HttpStatus.OK, type: [ProductCategory] })
  @ApiParam({
    name: 'saleUnit',
    description: 'sale unit of categories',
    type: Number
  })
  @Get('/categories/:saleUnit')
  getCategoryBySaleUnit(@Param('saleUnit', ParseIntPipe) saleUnit: number) {
    return this.saleUnitService.getCategoryByShopId(saleUnit);
  }

  @ApiResponse({
    status: HttpStatus.OK,
    type: ShopGetProductResponseDTO
  })
  @Get('/products')
  getProductByCategory(
    @Query('categoryId') categoryId: number,
    @Query('limit') limit: number,
    @Query('offset') offset: number
  ) {
    return this.shopService.getProductByCategory(categoryId, limit, offset);
  }

  @Post()
  saveSaleOrder(@Body() model: SaleOrderDto, @CurrentUser() current: User) {
    return this.saleOrderService.submit(model, current);
  }

  @Get('/locations/:orgUnit')
  @ApiResponse({ status: HttpStatus.OK, type: [Location] })
  getLocation(@Param('orgUnit', ParseIntPipe) organizationUnitId: number) {
    return this.shopService.getLocation(organizationUnitId);
  }
}
