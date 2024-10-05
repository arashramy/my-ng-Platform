import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  SetMetadata
} from '@nestjs/common';
import { ProductController } from './product.controller';
import { User } from '../../../base/entities/User';
import { Product } from '../entities/Product';
import {
  createQueryForEntity,
  createQueryWithoutPaging
} from '../../../common/decorators/mvc.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';


@Controller('api/online/shop/product')
export class OnlineShopProductController extends ProductController {


  @Get('/page')
  @SetMetadata('disable-auth-guard', true)
  async findPage(
    params: any,
    current: User
  ): Promise<{ total: any; content: Product[] }> {
    if (!params.limit) {
      params.limit = 10;
    }
    const query = createQueryForEntity(
      Product,
      this.prepareParams(params, current),
      'findAll',
      current,
      this.req,
      this.findAllPaging()
    );
    const result = await query.getManyAndCount();
    return {
      total: result[1],
      content: await this.postFetchAll(result[0])
    };
  }

  prepareParams(params: any, current: User) {
    console.log(params)
    return params;
  }

  @Get('/count')
  @SetMetadata('disable-auth-guard', true)
  getRowsCount(@CurrentUser() current: User, @Query() params: any) {
    return createQueryWithoutPaging(
      Product,
      this.prepareParams(params, current),
      'findAll',
      current,
      this.req
    ).getCount();
  }

  @Get('/:id')
  @SetMetadata('disable-auth-guard', true)
  async get(@Param('id') id: number, @CurrentUser() current: User) {
    const model = await createQueryForEntity(
      Product,
      id,
      'get',
      current,
      this.req
    );
    if (model) {
      return model;
    }
    throw new BadRequestException('Not found model');
  }


  @Get('/query')
  async query(@Query() params: any, @CurrentUser() current: User) {
    return createQueryForEntity(
      this.classRef,
      { limit: 50, ...this.prepareParams(params, current) },
      'autoComplete',
      current,
      this.req,
      this.queryPaging()
    ).getMany();
  }
}
