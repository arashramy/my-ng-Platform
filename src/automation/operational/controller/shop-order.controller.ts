import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import {
  PermissionAction,
  PermissionKey
} from '../../../common/constant/auth.constant';
import {
  createQueryForEntity,
  createQueryWithoutPaging
} from '../../../common/decorators/mvc.decorator';
import { common_permissions } from '../../../common/controller/base.controller';
import { SaleOrder } from '../entities/SaleOrder';
import { Role, User } from '../../../base/entities/User';
import { SaleOrderDto } from '../dto/sale-order.dto';
import { Response } from 'express';
import { getExportOptions } from '../../../common/decorators/export.decorator';
import { ExcelService } from '../../../common/export/ExcelService';
import { SseService } from '../../../common/sse/sse.service';
import { AccessTokenGuard } from '../../../auth/guard/access-token.guard';
import { REQUEST } from '@nestjs/core';
import { JwtPayload } from '../../../auth/dto/JwtPayload';
import { JwtUser } from '../../../auth/decorators/jwt-user.decorator';
import { AccessOrganizationFiscalYearInterceptor } from '../../../common/interceptors/access-organization-fiscal-year.interceptor';
import { SaleOrderService } from '../service/sale-order.service';

const shopOrderPermissions = (action: PermissionAction) => {
  return [
    ...common_permissions,
    PermissionKey.AUTOMATION_OPT_ORDERS,
    `${PermissionKey.AUTOMATION_OPT_ORDERS}_${action}`
  ];
};

@UseGuards(AccessTokenGuard)
@Controller('/api/sale/shop')
export class ShopOrderController {
  @Inject(ExcelService)
  excelService: ExcelService;
  @Inject(REQUEST)
  req: any;

  constructor(
    private service: SaleOrderService,
    private readonly sseService: SseService
  ) {}

  async commonQuery(params: any, current: User) {
    let query = createQueryForEntity(
      SaleOrder,
      params,
      'findAll',
      current,
      this.req
    );
    query.andWhere('items.id IS NOT NULL');
    if (current.roles.findIndex((r) => r == Role.Admin) < 0) {
      query.andWhere(
        `items.saleUnit in (${current.accessShops.map((s) => s.id).join(',')})`
      );
    }
    return query;
  }

  @Get('own')
  @UseGuards(AccessTokenGuard)
  async getOwnShopOrder(@JwtUser() user: JwtPayload, @Query() query: any) {
    const [content, total] = await createQueryForEntity(
      SaleOrder,
      { ...query, user: user.sub },
      'findAll',
      user,
      this.req
    ).getManyAndCount();

    return { total, content };
  }

  @Get()
  @Permissions([
    ...shopOrderPermissions(PermissionAction.READ),
    PermissionKey.AUTOMATION_OPT_MEMBERSHIP,
    PermissionKey.BASE_USERS,
    `${PermissionKey.AUTOMATION_OPT_MEMBERSHIP}_${PermissionAction.READ}`,
    `${PermissionKey.BASE_USERS}_${PermissionAction.READ}`
  ])
  async findAll(@Query() params: any, @CurrentUser() current: User) {
    return (await this.commonQuery(params, current)).getMany();
  }

  @Get('/export')
  @Header('Content-Type', 'text/xlsx')
  @Permissions([
    ...shopOrderPermissions(PermissionAction.EXPORT),
    PermissionKey.AUTOMATION_OPT_MEMBERSHIP,
    PermissionKey.BASE_USERS,
    `${PermissionKey.AUTOMATION_OPT_MEMBERSHIP}_${PermissionAction.EXPORT}`,
    `${PermissionKey.BASE_USERS}_${PermissionAction.EXPORT}`
  ])
  async export(
    @Query() params: any,
    @Res() res: Response,
    @CurrentUser() current: User
  ) {
    params.audit = true;
    let query = createQueryWithoutPaging(
      SaleOrder,
      params,
      'findAll',
      current,
      this.req
    );
    query.andWhere('items.id IS NOT NULL');
    if (current.roles.findIndex((r) => r == Role.Admin) < 0) {
      query.andWhere(
        `items.saleUnit in (${current.accessShops.map((s) => s.id).join(',')})`
      );
    }
    let columns: string[] = params.select?.split(',') || [];
    if (!columns.length) {
      columns = SaleOrder.getRepository().metadata.columns.map(
        (c) => c.propertyName
      );
    }
    let options = getExportOptions(SaleOrder);
    let file = await this.excelService.export(
      options,
      columns,
      await query.getCount(),
      query
    );
    res.download(file?.name);
  }

  @Get('/page')
  @Permissions([
    ...shopOrderPermissions(PermissionAction.READ),
    PermissionKey.AUTOMATION_OPT_MEMBERSHIP,
    PermissionKey.BASE_USERS,
    `${PermissionKey.AUTOMATION_OPT_MEMBERSHIP}_${PermissionAction.READ}`,
    `${PermissionKey.BASE_USERS}_${PermissionAction.READ}`
  ])
  async findPage(@Query() params: any, @CurrentUser() current: User) {
    let result = await (
      await this.commonQuery(params, current)
    ).getManyAndCount();
    return {
      total: result[1],
      content: result[0]
    };
  }

  @Get('/:id')
  @Permissions([
    ...shopOrderPermissions(PermissionAction.READ),
    PermissionKey.AUTOMATION_OPT_MEMBERSHIP,
    PermissionKey.BASE_USERS,
    `${PermissionKey.AUTOMATION_OPT_MEMBERSHIP}_${PermissionAction.READ}`,
    `${PermissionKey.BASE_USERS}_${PermissionAction.READ}`
  ])
  async get(@Param('id') id: number, @CurrentUser() current: User) {
    let model = await SaleOrder.createQueryBuilder('q')
      .leftJoinAndSelect('q.items', 'i')
      .leftJoinAndSelect('i.product', 'p')
      .leftJoinAndSelect('q.user', 'u')
      .leftJoinAndSelect('q.transactions', 't')
      .leftJoinAndSelect('t.createdBy', 'c')
      .where({ id: id })
      .getOne();
    if (model) {
      return model;
    }
    throw new BadRequestException('Not found model');
  }

  @Post()
  @UseInterceptors(AccessOrganizationFiscalYearInterceptor)
  @Permissions(shopOrderPermissions(PermissionAction.CREATE))
  async submit(@Body() model: SaleOrderDto, @CurrentUser() current: User) {
    return this.service.submit(model, current);
  }

  @Delete('/:id')
  @Permissions(shopOrderPermissions(PermissionAction.DELETE))
  async delete(@Param('id') id: number, @CurrentUser() current: User) {
    return this.service.delete(id, current);
  }
}
