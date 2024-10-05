import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentFiscalYear } from '../../../common/decorators/current-fiscal-year.decorator';
import { CurrentOrgUnit } from '../../../common/decorators/current-org-unit.decorator';
import { User } from '../../base/dto/group-class-room.dto';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../../auth/guard/access-token.guard';
import { SaleOrderService } from '../../../automation/operational/service/sale-order.service';
import { JwtUser } from '../../../auth/decorators/jwt-user.decorator';
import { JwtPayload } from '../../../auth/dto/JwtPayload';
import { createQueryForEntity } from '../../../common/decorators/mvc.decorator';
import { SaleItem } from '../../../automation/operational/entities/SaleItem';
import { SaleOrderDto } from '../../../automation/operational/dto/sale-order.dto';
import { TransactionService } from '../../../automation/operational/service/transaction.service';
import { DataSource } from 'typeorm';
import { FiscalYear } from '../../../base/entities/FiscalYears';
import { OrganizationUnit } from '../../../base/entities/OrganizationUnit';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { Payment } from '../../../payment/entities/payment.entity';

@Controller('api/online/shop/order')
@UseGuards(AccessTokenGuard)
export class OnlineShoppingController {
  constructor(
    private service: SaleOrderService,
    private trxService: TransactionService,
    private ds: DataSource
  ) {}

  @Get('page')
  @UseGuards(AccessTokenGuard)
  async findPageable(
    @Query() params: any,
    @CurrentOrgUnit({ headerOnly: true }) orgUnit,
    @CurrentFiscalYear({ headerOnly: true }) fiscalYear,
    @CurrentUser() current: any
  ) {
    if (!params.limit) {
      params.limit = 10;
    }

    params.organizationUnit = orgUnit;
    params.fiscalYear = fiscalYear;
    const result = await this.service.findAll(params, current);
    return { total: result[1], content: result[0] };
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
  async getSessions(@Param('id') id: any, @CurrentUser() current: User) {
    console.log('getSessions');
    return await SaleItem.find({
      where: { registeredService: { id: id } },
      relations: [
        'contractor',
        'saleOrder',
        'product',
        'saleOrder.lockers',
        'saleOrder.vipLocker',
        'saleUnit'
      ]
    });
  }

  @Post('/settle')
  async settle(@Body() dto: SaleOrderDto, @CurrentUser() current: any) {
    return this.service.settle(dto, current);
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  async register(@Body() model: any, @CurrentUser() current: any) {
    const fiscalYear = await FiscalYear.findOne({ where: {} });
    const org = await OrganizationUnit.findOne({ where: {} });
    const saleUnit = await SaleUnit.findOne({ where: { isOnline: true } });
    const payment = await Payment.findOne({
      where: { authority: model.authority },
      relations: ['gateway', 'order']
    });

    if (!saleUnit) {
      throw new BadRequestException(
        'واخد فروش انلاین یافت نشد لظفا با پشتیبانی تماس بگیرید.'
      );
    }

    if (payment) {
      throw new BadRequestException('this payment has order already');
    }

    model.fiscalYear = fiscalYear;
    model.organizationUnit = org.id;

    console.log('saleUnit', saleUnit);

    model.saleUnit = saleUnit.id;

    const response = await this.service.submit(model, current);

    // payment.order = response as any;

    await payment.save();
    return response;
  }

  @Put('/:id')
  async edit(
    @Param('id') id: number,
    @Body() model: SaleOrderDto,
    @CurrentUser() current: any
  ) {
    return this.service.submit(model, current);
  }

  @Delete('/:id')
  async delete(@Param('id') id: number, @CurrentUser() current: any) {
    return this.service.delete(id, current);
  }

  @Delete('/delete-transactions/:id')
  async deleteTransactions(
    @Param('id') id: number,
    @Query('types') types: string,
    @Query('refresh') refresh: boolean,
    @CurrentUser() current: any
  ) {
    return this.ds.manager.transaction((manager) => {
      let t = [];
      if (types) {
        t = types?.split(',')?.map((x) => parseInt(x));
      }
      return this.trxService.deleteAllByOrderId(
        id,
        t,
        true,
        refresh,
        current,
        manager
      );
    });
  }

  @Post()
  async reception(@Body() dto: SaleOrderDto, @CurrentUser() current: any) {
    return this.service.submit(dto, current);
  }
}
