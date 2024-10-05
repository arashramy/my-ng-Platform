import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import {
  PermissionAction,
  PermissionKey
} from '../../../common/constant/auth.constant';
import {
  common_permissions,
  ReadController
} from '../../../common/controller/base.controller';
import { TransactionDto } from '../dto/transaction.dto';
import { User } from '../../../base/entities/User';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { createQueryForEntity } from '../../../common/decorators/mvc.decorator';
import { AccessOrganizationFiscalYearInterceptor } from '../../../common/interceptors/access-organization-fiscal-year.interceptor';
import { AccessTokenGuard } from '../../../auth/guard/access-token.guard';
import { UserLoan } from '../entities/UserLoan';
import { LoanService } from '../service/loan.service';
import { UserLoanDto } from '../dto/user-loan.dto';
import { TransactionService } from '../service/transaction.service';
import { InstallmentLoan } from '../entities/InstallmentLoan';
import { IsNull, Not } from 'typeorm';
import { SaleOrder } from '../entities/SaleOrder';

const userLoanPermissions = (action: PermissionAction) => {
  return [
    ...common_permissions,
    PermissionKey.AUTOMATION_OPT_LOAN,
    `${PermissionKey.AUTOMATION_OPT_LOAN}_${action}`
  ];
};

@Controller('/api/user-loan')
export class UserLoanController extends ReadController<UserLoan> {
  additionalPermissions(): string[] {
    return [];
  }

  constructor(private service: LoanService) {
    super(UserLoan, PermissionKey.AUTOMATION_OPT_LOAN);
  }

  @Post('settle-installment/:id')
  settleInstallmentLoan(
    @Body() dto: TransactionDto,
    @Param('id') installmentLoanId: number,
    @CurrentUser() user: User
  ) {
    return this.service.settleInstallmentLoan(dto, installmentLoanId, user);
  }

  @Get('total/payment')
  async getTotalPayment() {
    const payments = await InstallmentLoan.find({
      where: { loan: Not(IsNull()) },
      relations: { transactions: true, loan: true }
    });
    const p = payments
      .filter((e) => e.loan)
      .map((e) => ({
        totalPay: e.amount,
        totalPayed: e.transactions.reduce((acc, item) => acc + e.amount, 0),
        totalRemainPay:
          e.amount - e.transactions.reduce((acc, item) => acc + e.amount, 0)
      }));

    return {
      totalPay: p.reduce((acc, item) => acc + item.totalPay, 0),
      totalPayed: p.reduce((acc, item) => acc + item.totalPayed, 0),
      totalRemainPay: p.reduce((acc, item) => acc + item.totalRemainPay, 0)
    };
  }

  @Get('timeout')
  @Permissions(userLoanPermissions(PermissionAction.READ))
  async timeout(@CurrentUser() user: User) {
    return this.service.findInstallmentTimeoutForDashboard();
  }

  @Get('own/timeout')
  @UseGuards(AccessTokenGuard)
  async myTimeout(@CurrentUser() user: User) {
    return this.service.findUserInstallmentTimeoutForDashboard(user);
  }

  @Patch('assign-order/:id')
  async assignOrderToUserLoan(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { order: number }
  ) {
    const saleorder = await SaleOrder.findOne({ where: { id: body.order } });
    const userLoan = await UserLoan.update(id, { order: saleorder });
    if (!userLoan.affected)
      throw new NotFoundException(
        'the process of updating user loan is failed ...'
      );
  }

  @Post('/settle')
  settleUserLoan() {}

  @Get('own')
  @UseGuards(AccessTokenGuard)
  async getOwnTransaction(@CurrentUser() user: User, @Query() query: any) {
    const [content, total] = await this.postFetchAll(
      await createQueryForEntity(
        UserLoan,
        { ...query, user: +user.id },
        'findAll',
        user,
        this.req
      ).getManyAndCount()
    );

    return { total, content };
  }

  @UseInterceptors(AccessOrganizationFiscalYearInterceptor)
  @Post()
  @Permissions(userLoanPermissions(PermissionAction.CREATE))
  async add(@Body() model: UserLoanDto, @CurrentUser() current: User) {
    return this.service.add(model, current);
  }

  @UseInterceptors(AccessOrganizationFiscalYearInterceptor)
  @Put('/:id')
  @Permissions(userLoanPermissions(PermissionAction.UPDATE))
  async edit(
    @Param() id: number,
    @Body() model: UserLoanDto,
    @CurrentUser() current: User
  ) {
    return this.service.update(id, model, current);
  }

  @UseInterceptors(AccessOrganizationFiscalYearInterceptor)
  @Post('/settle/:id')
  @Permissions(userLoanPermissions(PermissionAction.SETTLE))
  async settle(
    @Param() id: number,
    @Body() model: TransactionDto,
    @CurrentUser() current: User
  ) {}

  @Delete('/:id')
  @Permissions(userLoanPermissions(PermissionAction.DELETE))
  async delete(@Param('id') id: number, @CurrentUser() current: User) {
    return this.service.remove(id, current);
  }
}
