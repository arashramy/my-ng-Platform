import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import {
  common_permissions,
  ReadController
} from '../../../common/controller/base.controller';
import {
  PermissionAction,
  PermissionKey
} from '../../../common/constant/auth.constant';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { User } from '../../../base/entities/User';
import { ArchivedRegisteredServiceDto } from '../dto/registered-service.dto';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { createQueryForEntity } from '../../../common/decorators/mvc.decorator';
import { JwtPayload } from '../../../auth/dto/JwtPayload';
import { AccessTokenGuard } from '../../../auth/guard/access-token.guard';
import { JwtUser } from '../../../auth/decorators/jwt-user.decorator';
import { AccessOrganizationFiscalYearInterceptor } from '../../../common/interceptors/access-organization-fiscal-year.interceptor';
import { SaleOrderService } from '../service/sale-order.service';
import { SseService } from '../../../common/sse/sse.service';
import { RegisteredProductProvider } from '../service/registered-product-provider';
import { SaleOrderDto } from '../dto/sale-order.dto';
import { SaleOrder } from '../entities/SaleOrder';
import { SaleItem } from '../entities/SaleItem';
import { ArchivedProvider } from '../service/archived-provider';
import { Product } from '../../../automation/base/entities/Product';
import { ProductType } from '../../../automation/base/entities/ProductCategory';
import moment from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';
import { DataSource } from 'typeorm';
import { plainToClass, plainToInstance } from 'class-transformer';
import { Transaction } from '../entities/Transaction';
import { TransactionSourceType } from '../../../base/entities/TransactionSource';

class Nima {
  id: number;
  start_date: Date;
  end_date: Date;
}

const registerServicePermissions = (action: PermissionAction) => {
  return [
    ...common_permissions,
    PermissionKey.AUTOMATION_OPT_REGISTERED_SERVICE,
    `${PermissionKey.AUTOMATION_OPT_REGISTERED_SERVICE}_${action}`
  ];
};

@Controller('/api/sale/service')
export class RegisteredServiceController extends ReadController<SaleOrder> {
  constructor(
    private service: SaleOrderService,
    private archivedProvider: ArchivedProvider,
    private readonly dataSource: DataSource
  ) {
    super(SaleOrder, PermissionKey.AUTOMATION_OPT_REGISTERED_SERVICE);
  }

  prepareParams(params: any, current: User): any {
    if (current.isMembership()) {
      Object.assign(params, { user: current.id });
    } else if (!current.isAdmin()) {
      Object.assign(params, {
        by_access: current.accessShops?.map((s) => s.id).join(',')
      });
    }
    return params;
  }

  @Get('own')
  @UseGuards(AccessTokenGuard)
  async getOwn(@JwtUser() user: JwtPayload, @Query() query: any) {
    const [content, total] = await createQueryForEntity(
      SaleItem,
      { ...query, user: +user.sub },
      'findAll',
      user,
      null
    ).getManyAndCount();

    return { total, content };
  }

  @Get('/sessions/:id')
  @Permissions(registerServicePermissions(PermissionAction.READ))
  async getSessions(@Param('id') id: any, @CurrentUser() current: User) {
    return await SaleItem.find({
      where: { registeredService: { id: id } },
      order: {
        saleOrder: {
          start: 'desc'
        }
      },
      relations: [
        'contractor',
        'saleOrder',
        'product',
        'saleOrder.lockers',
        'saleUnit'
      ]
    });
  }

  @Get('/sessions/own/:id')
  async getSessionsOwn(@Param('id') id: any, @CurrentUser() current: User) {
    return SaleItem.find({
      where: { registeredService: { id }, user: { id: current.id } },
      relations: {
        contractor: true,
        saleUnit: true,
        saleOrder: { vipLocker: true },
        locker: true
      }
    });
  }

  @Get('/charging-service/sessions/:id')
  async getSessionsChargingservice(
    @Param('id') id: any,
    @CurrentUser() user: User
  ) {
    return await Transaction.find({
      where: { source: id, sourceType: TransactionSourceType.ChargingService },
      relations: ['order', 'order.items', 'saleUnit'],
      order:{submitAt:'desc',id:'desc'}
    });
  }

  @Post('/archived')
  @Permissions(registerServicePermissions(PermissionAction.ARCHIVED))
  async archived(
    @Body() model: ArchivedRegisteredServiceDto,
    @CurrentUser() current: User
  ) {
    return this.archivedProvider.archived(
      model.id,
      model.returnBack,
      model.returnBackContractorIncomeType,
      current
    );
  }

  @Post()
  @UseInterceptors(AccessOrganizationFiscalYearInterceptor)
  @Permissions(registerServicePermissions(PermissionAction.CREATE))
  async register(@Body() model: SaleOrderDto, @CurrentUser() current: User) {
    // const hasTransferPermission = hasAnyPermissions(current, [
    //   PermissionKey.TRANSFER_REGISTERED_SERVICE,
    //   ...common_permissions,
    // ]);
    // if (model.isTransfer && !hasTransferPermission) {
    //   throw new ForbiddenException('You Dont have Access');
    // }
    return this.service.submit(model, current);
  }

  @Put('/:id')
  @Permissions(registerServicePermissions(PermissionAction.UPDATE))
  async edit(
    @Param('id') id: number,
    @Body() model: SaleOrderDto,
    @CurrentUser() current: User
  ) {
    return this.service.submit(model, current);
  }

  @Delete('/:id')
  @Permissions(registerServicePermissions(PermissionAction.DELETE))
  async delete(@Param('id') id: number, @CurrentUser() current: User) {
    return this.service.delete(id, current);
  }

  additionalPermissions(): any[] {
    return [
      PermissionKey.AUTOMATION_OPT_MEMBERSHIP,
      PermissionKey.BASE_USERS,
      `${PermissionKey.AUTOMATION_OPT_MEMBERSHIP}_${PermissionAction.READ}`,
      `${PermissionKey.BASE_USERS}_${PermissionAction.READ}`,
      PermissionKey.AUTOMATION_OPT_RECEPTION,
      PermissionKey.AUTOMATION_OPT_SECONDARY_SERVICE,
      `${PermissionKey.AUTOMATION_OPT_RECEPTION}_${PermissionAction.READ}`,
      `${PermissionKey.AUTOMATION_OPT_RECEPTION}_${PermissionAction.CREATE}`,
      `${PermissionKey.AUTOMATION_OPT_RECEPTION}_${PermissionAction.UPDATE}`,
      `${PermissionKey.AUTOMATION_OPT_SECONDARY_SERVICE}_${PermissionAction.READ}`,
      `${PermissionKey.AUTOMATION_OPT_SECONDARY_SERVICE}_${PermissionAction.UPDATE}`,
      `${PermissionKey.AUTOMATION_OPT_SECONDARY_SERVICE}_${PermissionAction.CREATE}`
    ];
  }
}
