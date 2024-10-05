import { Controller } from '@nestjs/common';
import { PermissionKey } from '../../common/constant/auth.constant';
import { BaseController } from '../../common/controller/base.controller';
import { Cheque } from '../entities/Cheque';
import { DataSource } from 'typeorm';
import { TransactionService } from '../../automation/operational/service/transaction.service';
import { ShiftWorkService } from '../../base/service/shift-work.service';
import { User } from '../../base/entities/User';

@Controller('/api/cheque')
export class ChequeController extends BaseController<Cheque> {
  constructor(
    public readonly ds: DataSource,
    public readonly transactionService: TransactionService,
    public readonly shiftworkService: ShiftWorkService
  ) {
    super(Cheque, PermissionKey.TREASURY_OPT_CHEQUE);
  }

  additionalPermissions(): any[] {
    return [];
  }

  // async postCreate(model: Cheque, current: User): Promise<Cheque> {
  //   const result = await super.postCreate(model, current);
  //   const cheque = await Cheque.findOne({
  //     where: { id: result.id },
  //     relations: {
  //       user: true,
  //       fiscalYear: true,
  //       saleUnit: true,
  //       organizationUnit: true
  //     }
  //   });
  //   let shiftwork = await this.shiftworkService.findBy(
  //     new Date(),
  //     cheque?.organizationUnit?.id
  //   );
  //   if (!shiftwork) {
  //     throw new BadRequestException('Invalid shift work');
  //   }

  //   let trx = new Transaction();
  //   trx.source = cheque?.id;
  //   trx.user = cheque?.user;
  //   trx.organizationUnit = cheque.organizationUnit;
  //   trx.fiscalYear = cheque.fiscalYear;
  //   trx.shiftWork = shiftwork;
  //   trx.saleUnit = cheque.saleUnit;
  //   trx.createdBy = current;
  //   trx.type = TransactionType.Deposit;
  //   trx.sourceType = TransactionSourceType.Cheque;
  //   trx.description = cheque.description;
  //   trx.amount = cheque.amount;
  //   trx.meta = {
  //     number: cheque.number,
  //     bank: cheque.bank,
  //     date: cheque.date,
  //     amount: cheque.amount
  //   };
  //   trx.title = cheque.number;
  //   trx = await this.transactionService.doTransaction(
  //     trx,
  //     false,
  //     this.ds.manager,
  //     -trx.amount,
  //     true
  //   );
  //   trx.credit = trx.user.credit;
  //   trx = await trx.save();
  //   return result;
  // }

  async prepareDelete(id: number | number[]): Promise<void> {}
}
