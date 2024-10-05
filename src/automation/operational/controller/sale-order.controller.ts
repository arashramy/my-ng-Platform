import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import {
  common_permissions,
  hasAnyPermissions,
  ReadController
} from '../../../common/controller/base.controller';
import {
  PermissionAction,
  PermissionKey
} from '../../../common/constant/auth.constant';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Role, User } from '../../../base/entities/User';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { createQueryForEntity } from '../../../common/decorators/mvc.decorator';
import { JwtPayload } from '../../../auth/dto/JwtPayload';
import { AccessTokenGuard } from '../../../auth/guard/access-token.guard';
import { JwtUser } from '../../../auth/decorators/jwt-user.decorator';
import { AccessOrganizationFiscalYearInterceptor } from '../../../common/interceptors/access-organization-fiscal-year.interceptor';
import { SaleOrderService } from '../service/sale-order.service';
import { SaleOrderDto, TransactionItem } from '../dto/sale-order.dto';
import { SaleOrder, SentToTaxStatus } from '../entities/SaleOrder';
import { SaleItem } from '../entities/SaleItem';
import { CurrentOrgUnit } from '../../../common/decorators/current-org-unit.decorator';
import { CurrentFiscalYear } from '../../../common/decorators/current-fiscal-year.decorator';
import { ReceptionService } from '../service/reception.service';
import { TransactionService } from '../service/transaction.service';
import { DataSource, In } from 'typeorm';
import { ImportService } from '../../../common/import/ImportService';
import { FileInterceptor } from '@nestjs/platform-express';
import moment from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Setting, SettingKey } from '../../../base/entities/Setting';

const shopOrderPermissions = (action: PermissionAction) => {
  return [
    ...common_permissions,
    PermissionKey.AUTOMATION_OPT_ORDERS,
    `${PermissionKey.AUTOMATION_OPT_ORDERS}_${action}`
  ];
};

@Controller('/api/sale-order')
export class SaleOrderController extends ReadController<SaleOrder> {
  constructor(
    private service: SaleOrderService,
    private receptionService: ReceptionService,
    private trxService: TransactionService,
    private ds: DataSource,
    public readonly importService: ImportService,
    @InjectQueue('sent-to-tax') public sentToTaxQueue: Queue
  ) {
    super(SaleOrder, PermissionKey.AUTOMATION_OPT_REGISTERED_SERVICE);
  }

  @Post('/import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(
    @UploadedFile(new ParseFilePipe()) file: Express.Multer.File
  ) {
    return this.importService.import(file.buffer, this.classRef);
  }

  async prepareParamsExcel(params: any, current: User) {
    if (params['usergroups.contains']) {
      const users = await User.find({
        where: { groups: { id: params['usergroups.contains'] } }
      });
      params['user.id.in'] = `${users.map((e) => e.id).join(',')}`;
    }
    if (params.reception) {
      if (
        params.loginStatus == 0 ||
        params.loginStatus == 2 ||
        params.loginStatus == 3
      ) {
        if (params['start']) {
          params['submitAt.gte'] = moment(
            `${params['start']} 00:00`,
            AppConstant.SUBMIT_TIME_FORMAT
          ).toDate();
        }
        if (params['end']) {
          params['submitAt.lte'] = moment(
            `${params['start']} 00:00`,
            AppConstant.SUBMIT_TIME_FORMAT
          ).toDate();
        }
        if (params.loginStatus == 0) {
          // query.andWhere({ end: Not(IsNull()) });
          params = { ...params, 'end.notnull': 1 };
        } else if (params.loginStatus == 2) {
          params = { ...params, 'end.isnull': 1 };
        }
      } else if (params.loginStatus == 1) {
        console.log('ssss');
        params = { ...params, 'end.isnull': 1 };
      }
    }
    delete params['usergroups.contains'];
    return params;
  }

  @Post('fix-transferable-saleorder')
  async fixTransferableSaleOrder() {
    const saleOrders = await SaleItem.find({ where: { isTransfer: true } });
    for (let i = 0; i < saleOrders.length; i++) {
      await SaleOrder.update(
        { id: saleOrders[i].saleOrderId },
        { isTransfer: true }
      );
    }
  }

  @Get('/import-example')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  @Header('Content-Disposition', 'attachment; filename="import-sample.xlsx"')
  async downloadImportExampleFile(
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    const file = await this.importService.importSample(this.classRef);
    return new StreamableFile(file);
  }

  @Get('/subscription/:userId')
  getSubscriptionByUserId(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.getSubscriptionServiceByUserId(userId);
  }

  @Get('/report')
  async report(@Query() params: any, @CurrentUser() user: User) {
    return this.receptionService.currentReport(params, user);
  }

  @Get('page')
  async findPageable(
    @Query() params: any,
    @CurrentOrgUnit({ headerOnly: true }) orgUnit,
    @CurrentFiscalYear({ headerOnly: true }) fiscalYear,
    @CurrentUser() current: User
  ) {
    if (
      !hasAnyPermissions(current, [
        ...common_permissions,
        this.key,
        `${this.key}_${PermissionAction.READ}`,
        ...this.additionalPermissions()
      ])
    ) {
      if (current.roles.includes(Role.Contactor)) {
        params.contractor = current.id;
      } else {
        throw new ForbiddenException('Access denied');
      }
    }
    if (!params.limit) {
      params.limit = 10;
    }
    if (!params.organizationUnit) {
      params.organizationUnit = orgUnit;
    }
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
  @Permissions(shopOrderPermissions(PermissionAction.READ))
  async getSessions(@Param('id') id: any, @CurrentUser() current: User) {
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

  prepareOwnParams(params: any, current: User): Promise<any> {
    return { ...params, user: current?.id };
  }

  @Post('/settle-multiple')
  @Permissions([
    ...common_permissions,
    PermissionKey.AUTOMATION_OPT_ORDERS,
    `${PermissionKey.AUTOMATION_OPT_ORDERS}_${PermissionAction.SETTLE}`
  ])
  async settleMultiple(
    @Body()
    dtos: {
      orderIds: number[];
      transactions: TransactionItem[];
    },
    @CurrentUser() current: User
  ) {
    const x = this.service.settleMultipleSaleOrder(
      {
        orderIds: dtos.orderIds,
        transactions: dtos.transactions
      },
      current
    );

    return x;
  }

  @Post('/settle')
  @Permissions([
    ...common_permissions,
    PermissionKey.AUTOMATION_OPT_ORDERS,
    `${PermissionKey.AUTOMATION_OPT_ORDERS}_${PermissionAction.SETTLE}`
  ])
  async settle(@Body() dto: SaleOrderDto, @CurrentUser() current: User) {
    return this.service.settle(dto, current);
  }

  @Post()
  @UseInterceptors(AccessOrganizationFiscalYearInterceptor)
  @Permissions(shopOrderPermissions(PermissionAction.CREATE))
  async register(@Body() model: SaleOrderDto, @CurrentUser() current: User) {
    // const hasTransferPermission = hasAnyPermissions(current, [
    //   PermissionKey.TRANSFER_REGISTERED_SERVICE,
    //   ...common_permissions,
    // ]);
    return this.service.submit(model, current);
  }

  @Put('/send-to-tax')
  async sentToTaxSaleOrder(@Body() body: any, @CurrentUser() current: any) {
    const value = await Setting.findByKey(SettingKey.SendToTax);

    if (!value.pakokToken || typeof value.isSingle === typeof undefined) {
      throw new BadRequestException('please compelete tax setting first');
    }
    console.log('startttttttttttttt');

    body.map((el) =>
      el.items.map((el) => {
        if (!el.product.uniqueTaxCode) {
          throw new BadRequestException(
            `کالای ${el.product.title} کدیکتای مالیاتی ندارد.`
          );
        }
      })
    );

    // const results: invoiceDTOs[] = [];
    // for (let index = 0; index < body.length; index++) {
    //   const e = body[index];
    //   const invoiceDetails: invoiceDetailsDto[] = [];
    //   e.items?.map((el) => {
    //     if (el.amount !== 0) {
    //       const findIndex = invoiceDetails.findIndex(
    //         (element) => +element.externalID === el.product.id
    //       );
    //       if (findIndex >= 0) {
    //         invoiceDetails[findIndex].value += el.quantity;
    //         // invoiceDetails[findIndex].tax += el.tax;
    //         invoiceDetails[findIndex].discountAmount += el.discount;
    //       } else {
    //         invoiceDetails.push({
    //           externalID: `${el?.product?.id}`,
    //           externaProductName: el.product.title,
    //           externaProductTaxID: el?.product?.uniqueTaxCode,
    //           externaProductCode: el?.product?.uniqueTaxCode,
    //           externaTaxRate: el?.tax,
    //           externaLegalAmountRate: 0,
    //           externaOtherTaxRate: 0,
    //           productDescription: el.product.description || el?.product?.title,
    //           value: el.quantity,
    //           unitAmount: el.product.price,
    //           discountAmount: el.discount,
    //           taxRate: el.tax,
    //           otherTaxRate: 0,
    //           legalAmountRate: 0
    //         });
    //       }
    //     }
    //   });

    //   results.push({
    //     personExternalID: `${e.user?.id}`,
    //     personTypeID: e.user.isLegal ? personType.Legal : personType.Genuine,
    //     economicCode: !!e?.user?.isLegal
    //       ? e?.user?.companyNationCode
    //       : !e?.user?.isLegal && e?.user?.personalTaxCode && e?.user?.nationCode
    //       ? e?.user?.personalTaxCode
    //       : '',
    //     name: e.user.firstName,
    //     lastName: e.user.lastName,
    //     nationalCode: !!e?.user?.isLegal
    //       ? e?.user?.companyNationCode
    //       : !e?.user?.isLegal && e?.user?.personalTaxCode && e?.user?.nationCode
    //       ? e?.user?.nationCode
    //       : '',
    //     invoiceDate: e.submitAt,
    //     invoiceSubjectID: invoiceSubjectType.Sale,
    //     invoiceSettlementMethodID: invoiceSettlementMethodType.Cash,
    //     cashPaymentAmount: 0,
    //     loanPaymentAmount: 0,
    //     invoiceTaxTypeID:
    //       (e?.user?.isLegal && e?.user?.companyNationCode) ||
    //       (!e?.user?.isLegal && e?.user?.personalTaxCode && e?.user?.nationCode)
    //         ? invoiceTaxType.WithCustomer
    //         : invoiceTaxType.WithoutCustomer,
    //     invoiceExternalID: e.id ? `${e.id}` : null,
    //     invoiceDetails: invoiceDetails
    //   });
    // }
    // return results;

    await SaleOrder.update(
      { id: In(body.reduce((result, i) => [...result, ...i.orderIds], [])) },
      {
        sentToTaxStatus: SentToTaxStatus.Sending,
        sentToTaxDate: new Date(),
        sentToTaxBy: current
      }
    );

    const chunkCount = Math.ceil(body.length / 50);
    console.log('chunkCount', chunkCount);
    for (let i = 0; i < chunkCount; i++) {
      const chunk = body.splice(0, 50);
      await this.sentToTaxQueue.add(
        {
          data: chunk,
          token: value?.pakokToken
        },
        { removeOnComplete: true }
      );
    }

    return true;
  }

  @Get('last-send-to-tax-date')
  getLastdate() {
    return this.service.getLastDate();
  }

  @Put()
  async updateSaleOrders(@Body() body: any, @CurrentUser() current: User) {
    for (let i = 0; i < body.length; i++) {
      console.log('isSendEvent', i + 1 === body.length ? true : false);
      await this.service.submit(
        body[i],
        current,
        (order) => console.log(order),
        true,
        true,
        i + 1 === body.length ? true : false
      );
    }
  }

  @Put('/:id')
  @Permissions(shopOrderPermissions(PermissionAction.UPDATE))
  async edit(
    @Param('id') id: number,
    @Body() model: SaleOrderDto,
    @CurrentUser() current: User
  ) {
    return this.service.submit(model, current);
  }

  @Delete('/:id')
  @Permissions(shopOrderPermissions(PermissionAction.DELETE))
  async delete(@Param('id') id: number, @CurrentUser() current: User) {
    return this.service.delete(id, current);
  }

  @Permissions([
    `${Role.Admin}`,
    `${PermissionKey.AUTOMATION_OPT_TRANSACTIONS}`,
    `${PermissionKey.AUTOMATION_OPT_TRANSACTIONS}_${PermissionAction.DELETE}`
  ])
  @Delete('/delete-transactions/:id')
  async deleteTransactions(
    @Param('id') id: number,
    @Query('types') types: string,
    @Query('refresh') refresh: boolean,
    @CurrentUser() current: User
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
  @UseInterceptors(AccessOrganizationFiscalYearInterceptor)
  @Permissions([
    ...common_permissions,
    PermissionKey.AUTOMATION_OPT_RECEPTION,
    `${PermissionKey.AUTOMATION_OPT_RECEPTION}_${PermissionAction.CREATE}`,
    `${PermissionKey.AUTOMATION_OPT_RECEPTION}_${PermissionAction.UPDATE}`
  ])
  async reception(@Body() dto: SaleOrderDto, @CurrentUser() current: User) {
    return this.service.submit(dto, current);
  }

  @Get('/logout/all/:id')
  @Permissions([
    ...common_permissions,
    PermissionKey.AUTOMATION_OPT_RECEPTION,
    `${PermissionKey.AUTOMATION_OPT_RECEPTION}_${PermissionAction.LOGOUT}`
  ])
  async logoutAll(@Param('id') saleUnit: number, @CurrentUser() current: User) {
    return this.receptionService.logoutAll(saleUnit, current);
  }

  @Post('/logout')
  @Permissions([
    ...common_permissions,
    PermissionKey.AUTOMATION_OPT_RECEPTION,
    `${PermissionKey.AUTOMATION_OPT_RECEPTION}_${PermissionAction.LOGOUT}`
  ])
  async logout(@Body() dto: SaleOrderDto, @CurrentUser() current: User) {
    return this.receptionService.logout(dto, current);
  }

  @Delete('/back-to-login/:id')
  async backToLogin(@Param('id') id: number, @CurrentUser() current: User) {
    return this.receptionService.backToLogin(id, current);
  }

  @Get('/tax-status')
  gettaxData(@Query() query: any, @CurrentUser() current: User) {
    console.log(query);
    return this.service.getTaxSaleOrderService(query, current);
  }

  @Post('/penalty-apply')
  async checkPenaltySaleOrder(@Body() body: any, @CurrentUser() current: any) {
    console.log('check-penalty-saleOrder', body);
   
    const [content,_]=await this.service.penaltyApply(body.id, current);
    return content
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
