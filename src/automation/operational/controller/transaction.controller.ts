import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import {
  PermissionAction,
  PermissionKey
} from '../../../common/constant/auth.constant';
import { Transaction, TransactionType } from '../entities/Transaction';
import {
  common_permissions,
  ReadController
} from '../../../common/controller/base.controller';
import {
  TransactionDto,
  TransactionReportTotalBaseUser,
  WithdrawDto
} from '../dto/transaction.dto';
import { User } from '../../../base/entities/User';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { TransactionService } from '../service/transaction.service';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { createQueryForEntity } from '../../../common/decorators/mvc.decorator';
import { JwtPayload } from '../../../auth/dto/JwtPayload';
import { AccessOrganizationFiscalYearInterceptor } from '../../../common/interceptors/access-organization-fiscal-year.interceptor';
import { AccessTokenGuard } from '../../../auth/guard/access-token.guard';
import { TransactionSourceType } from '../../../base/entities/TransactionSource';
import moment from 'moment';
import { Between, DataSource } from 'typeorm';
import {SaleItem, SaleUnitType} from '../entities/SaleItem';
import { Response } from 'express';

const transactionsPermissions = (action: PermissionAction) => {
  return [
    ...common_permissions,
    PermissionKey.AUTOMATION_OPT_TRANSACTIONS,
    PermissionKey.AUTOMATION_OPT_ORDERS,
    PermissionKey.AUTOMATION_OPT_RECEPTION,
    PermissionKey.AUTOMATION_OPT_REGISTERED_SERVICE,
    `${PermissionKey.AUTOMATION_OPT_ORDERS}_${PermissionAction.SETTLE}`,
    `${PermissionKey.AUTOMATION_OPT_RECEPTION}_${PermissionAction.SETTLE}`,
    `${PermissionKey.AUTOMATION_OPT_REGISTERED_SERVICE}_${PermissionAction.CREATE}`,
    `${PermissionKey.AUTOMATION_OPT_REGISTERED_SERVICE}_${PermissionAction.UPDATE}`,
    `${PermissionKey.AUTOMATION_OPT_TRANSACTIONS}_${action}`
  ];
};

@Controller('/api/transaction')
export class TransactionController extends ReadController<Transaction> {
  additionalPermissions(): string[] {
    return [
      // PermissionKey.AUTOMATION_OPT_MEMBERSHIP,
      // PermissionKey.BASE_USERS,
      // `${PermissionKey.AUTOMATION_OPT_MEMBERSHIP}_${PermissionAction.READ}`,
      // `${PermissionKey.BASE_USERS}_${PermissionAction.READ}`,
      // PermissionKey.AUTOMATION_OPT_ORDERS,
      // PermissionKey.AUTOMATION_OPT_RECEPTION,
      // PermissionKey.AUTOMATION_OPT_REGISTERED_SERVICE,
      // `${PermissionKey.AUTOMATION_OPT_ORDERS}_${PermissionAction.READ}`,
      // `${PermissionKey.AUTOMATION_OPT_RECEPTION}_${PermissionAction.READ}`,
      // `${PermissionKey.AUTOMATION_OPT_REGISTERED_SERVICE}_${PermissionAction.READ}`,
    ];
  }

  constructor(
    private transactionService: TransactionService,
    private datasource: DataSource
  ) {
    super(Transaction, PermissionKey.AUTOMATION_OPT_TRANSACTIONS);
  }

  findAllPaging(): 'take' | 'offset' {
    return 'offset';
  }

  @Get('/deposite/report')
  getReportTransactionDeposite(@Query() query: any) {
    const queryBuilder = Transaction.createQueryBuilder('q')
      .select([])
      .addSelect('SUM(q.amount)', 'amount')
      .where('q.source_type = :source', {
        source: query?.source || TransactionSourceType.Bank
      })
      .andWhere('q.submit_at >= :submitAt', {
        submitAt: moment().format('YYYY-MM-DD')
      })
      .andWhere('q.submit_at < :tommorowSubmitAt', {
        tommorowSubmitAt: moment().add(1, 'day').format('YYYY-MM-DD')
      });
    if (query.orgUnit) {
      queryBuilder.andWhere('q.org_unit = :orgUnit', {
        orgUnit: query.orgUnit
      });
    }

    return queryBuilder
      .andWhere('type = :type', { type: TransactionType.Deposit })
      .getRawOne();
  }

  @Get('own')
  @UseGuards(AccessTokenGuard)
  async getOwnTransaction(@CurrentUser() user: User, @Query() query: any) {
    const [content, total] = await this.postFetchAll(
      await createQueryForEntity(
        Transaction,
        { ...query, user: +user.id },
        'findAll',
        null,
        this.req
      ).getManyAndCount()
    );

    return { total, content };
  }

  override prepareOwnParams(params: any, current: User): Promise<any> {
    return { ...params, user: +current.id };
  }
  prepareParams(params: any, current: User) {
    console.log('params prepareParams--------------------------', params);
    return params;
  }

  prepareParamsExcel(params: any, current: User) {
    console.log('params --------------------------', params);
    return { ...params };
  }

  @UseInterceptors(AccessOrganizationFiscalYearInterceptor)
  @Post()
  @Permissions(transactionsPermissions(PermissionAction.DEPOSIT))
  async deposit(
    @Body() model: TransactionDto,
    @Query('gift') byGift: boolean,
    @CurrentUser() current: User
  ) {
    return this.transactionService.deposit(model, byGift, current);
  }

  @UseInterceptors(AccessOrganizationFiscalYearInterceptor)
  @Post('/withdraw')
  @Permissions(transactionsPermissions(PermissionAction.WITHDRAW))
  async withdraw(@Body() model: WithdrawDto, @CurrentUser() current: User) {
    return this.transactionService.withdraw(model, current);
  }

  @UseInterceptors(AccessOrganizationFiscalYearInterceptor)
  @Post('/transfer')
  @Permissions(transactionsPermissions(PermissionAction.TRANSFER))
  async transfer(@Body() model: WithdrawDto, @CurrentUser() current: User) {
    return this.transactionService.transfer(model, current);
  }

  @Delete('/:id')
  @Permissions(transactionsPermissions(PermissionAction.DELETE))
  async delete(@Param('id') id: number, @CurrentUser() current: User) {
    return this.transactionService.removeTransaction(id, current);
  }

//this api can called for fixing single or multi charge item
// fix chargeRemainCredit just for charging items
  @Post('fix-charge-remain-credit')
  async fixSettingkey(@Body() body: any) {
    const data = [];
    let where = { type: SaleUnitType.Credit };
    if (body.id) where = { ...where, id: body.id } as any;
    const saleItems = await SaleItem.find({
      where: where
    });
    for (let index = 0; index < saleItems.length; index++) {
      const element = saleItems[index];
      const trxs = await Transaction.find({
        where: {
          source: element.id,
          sourceType: TransactionSourceType.ChargingService
        },
        order: { submitAt: 'ASC', id: 'ASC' }
      });
      let credit = element.credit;
      const p = trxs.map(async (e) => {
        e.chargeRemainCredit = +credit - (+e.amount || 0);
        credit -= +e.amount || 0;
        await e.save();
        return e;
      });

      data.push({
        content: trxs.map((e) => ({
          credit: e.credit,
          chargeRemainCredit: e.chargeRemainCredit,
          amount: e.amount,
          id: e.id
        })),
        length: trxs.length,
        chargingServiceId: element.id
      });
    }
    return data;
  }

  @Get('/report/users-cost')
  async getReportBaseUsersCosts(@Query() params: any) {
    return this.transactionService.getReportBaseUsersCosts(params);
  }

  @Get('/report/users-cost/export')
  @Header('Content-Type', 'text/xlsx')
  async ReportBaseUsersCostsExport(
    @Query() params: any,
    @Res() res: Response
  ) {
    const file =
      await this.transactionService.ReportBaseUsersCostsExport(
        params
      );

    return res.download(file.name);
  }

  @Post('fix-withdraw-trx-credit') //this api fix credit of transactions in withdraw action
  async fixWithdrawTrxCredit(@Body() body: any) {
    const transactions = [];
    const usersHaveWithraws = await Transaction.createQueryBuilder('q')
      .select([])
      .leftJoin('q.user', 'user')
      .addSelect('user.id', 'user')
      .where('q.type= :withdrawType', {
        withdrawType: TransactionType.Withdraw
      })
      .andWhere('q.sourceType= :sourceType', {
        sourceType: TransactionSourceType.UserCredit
      })
      .groupBy('user.id')
      .getRawMany();



    console.log(usersHaveWithraws.length)
    for (let index = 0; index < usersHaveWithraws.length; index++) {
      const element = usersHaveWithraws[index];
      const trx = await Transaction.findOne({
        where: {
          user: { id: element?.user },
          sourceType: TransactionSourceType.UserCredit,
          type: TransactionType.Withdraw
        },
        relations: { user: true },
        order: { submitAt: 'ASC' }
      });
      transactions.push(trx);
    }

    for (let index = 0; index < transactions.length; index++) {
      const element = transactions[index];

      await this.transactionService.normalizeTransactionAfterDate(
        element.user.id,
        element.submitAt,
        null,
        this.datasource.manager
      );
    }

    return {content:transactions,total:transactions.length};
  }
}
