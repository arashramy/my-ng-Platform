import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  IsNull,
  LessThan,
  MoreThanOrEqual
} from 'typeorm';
import { UserLoanDto } from '../dto/user-loan.dto';
import { TransactionService } from './transaction.service';
import { UserLoan } from '../entities/UserLoan';
import { Transaction, TransactionType } from '../entities/Transaction';
import { TransactionSourceType } from '../../../base/entities/TransactionSource';
import { BailType, Loan } from '../../base/entities/Loan';
import { User } from '../../../base/entities/User';
import moment from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { ShiftWorkService } from '../../../base/service/shift-work.service';
import { Cheque } from '../../../treasury/entities/Cheque';
import { Document } from '../../../base/entities/Document';
import { InstallmentLoan } from '../entities/InstallmentLoan';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SettingService } from '../../../common/service/setting.service';
import { SettingKey } from '../../../base/entities/Setting';
import { LoanNotificationConfigDto } from '../dto/setting/loan-notification.config.dto';
import { TransactionDto } from '../dto/transaction.dto';

@Injectable()
export class LoanService {
  constructor(
    private ds: DataSource,
    private transactionService: TransactionService,
    private shiftWorkService: ShiftWorkService,
    private eventEmitter: EventEmitter2,
    private settingService: SettingService
  ) {}

  async settleInstallmentLoan(
    transactionDtos: TransactionDto,
    installmentLoanId: number,
    current: User
  ) {
    let totalPayed = 0;
    const installmentLoan = await InstallmentLoan.findOne({
      where: { id: installmentLoanId },
      relations: {
        loan: {
          user: true,
          organizationUnit: true,
          fiscalYear: true,
          saleUnit: true,
          shiftWork: true,
          loan: true
        }
      }
    });
    if (!installmentLoan) {
      throw new NotFoundException('user loan is not defined  ...');
    }

    const items = await InstallmentLoan.find({
      where: { loan: { id: installmentLoan.loan.id } },
      relations: {
        loan: true,
        transactions: true
      }
    });

    totalPayed = items
      ?.map((e) =>
        e.transactions
          ?.map((e) => e.amount)
          ?.reduce((acc: any, item: any) => acc + +item, 0)
      )
      ?.reduce((acc, item) => acc + +item, 0);

    const transactions = await this.transactionService.settleInstallmentLoan(
      transactionDtos.items,
      installmentLoan,
      installmentLoan.loan,
      installmentLoan.loan.saleUnit,
      current,
      transactionDtos.submitAt,
      this.ds.manager
    );

    if (transactions.length > 0) {
      totalPayed += transactions
        ?.map((e) => e.amount)
        ?.reduce((acc: any, item: any) => acc + +item, 0);

      if (+totalPayed === +installmentLoan.loan.amount) {
        console.log('---------------------is paid--------------------------');
        installmentLoan.loan.isPayed = true;
        await installmentLoan.loan.save();
      }
    }

    return transactions;
  }

  async add(dto: UserLoanDto, current: User): Promise<[UserLoan, number]> {
    return this.ds.manager.transaction(async (manager) => {
      let loan: Loan = await manager.findOne(Loan, { where: { id: dto.loan } });
      if (!loan) {
        throw new BadRequestException('Not found loan');
      }
      let userLoan = new UserLoan();
      if (loan.amount != dto.amount && !loan.freeAmount) {
        throw new BadRequestException('Invalid loan amount');
      }
      if (loan.installments != dto.installments && !loan.freeInstallments) {
        throw new BadRequestException('Invalid loan installments count');
      }
      userLoan.loan = loan;
      userLoan.amount = dto.amount;
      userLoan.installments = dto.installments;
      userLoan.lateFeesRate = loan.lateFeesRate;
      userLoan.noPenaltyRange = loan.noPenaltyRange;
      userLoan.bailType = dto.bailType;
      userLoan.description = dto.description;
      userLoan.payedAmount = 0;
      userLoan.createdBy = current;
      if (dto.saleUnit) userLoan.saleUnit = { id: dto.saleUnit } as SaleUnit;
      if (loan.bailTypes?.length) {
        if (loan.bailTypes.indexOf(userLoan.bailType) < 0) {
          throw new BadRequestException('Invalid bail type');
        }
        if (userLoan.bailType == BailType.Cheque) {
          userLoan.cheque = await this.validateChequeBail(dto.cheque, manager);
        } else if (userLoan.bailType == BailType.User) {
          userLoan.user = await this.validateUserBail(dto.userBail);
        } else if (
          userLoan.bailType == BailType.PaySlip ||
          userLoan.bailType == BailType.BillOfExchange
        ) {
          userLoan.doc = await this.validateDocumentBail(
            dto.bailType,
            dto.doc,
            manager
          );
        }
      }
      let [organizationUnit, fiscalYear] =
        this.transactionService.processOperation(dto);
      userLoan.organizationUnit = organizationUnit;
      userLoan.fiscalYear = fiscalYear;
      try {
        userLoan.user = await manager.findOneOrFail(User, {
          where: { id: dto.user },
          cache: true
        });
      } catch (e) {
        throw new BadRequestException('User not found');
      }
      if (!dto.submitAt) {
        userLoan.submitAt = new Date();
      } else {
        let submitAt = moment(dto.submitAt, AppConstant.SUBMIT_TIME_FORMAT);
        if (!submitAt.isValid() || submitAt.isAfter(moment())) {
          throw new BadRequestException('Invalid submit date format');
        }
        userLoan.submitAt = submitAt.toDate();
      }
      let shift = await this.shiftWorkService.findBy(
        userLoan.submitAt,
        userLoan.organizationUnit?.id
      );
      if (!shift) {
        throw new BadRequestException('Invalid shift work');
      }
      userLoan.shiftWork = shift;
      if (dto.items.length != dto.installments) {
        throw new BadRequestException('Invalid installments');
      }
      userLoan.items = [];
      for (let item of dto.items) {
        let installmentLoan = new InstallmentLoan();
        installmentLoan.amount = Math.round(item.amount);
        installmentLoan.payTime = moment(
          item.payTime,
          AppConstant.DATE_FORMAT
        ).toDate();
        installmentLoan.description = item.description;
        if (item.cheque) {
          installmentLoan.cheque = await manager.findOne(Cheque, {
            where: { id: item.cheque }
          });
          if (!installmentLoan.cheque) {
            throw new BadRequestException('Invalid installments cheque');
          }
        }
        userLoan.items.push(installmentLoan);
      }
      userLoan = await manager.save(userLoan);
      let trx = new Transaction();
      trx.source = userLoan.id;
      trx.user = userLoan.user;
      trx.organizationUnit = userLoan.organizationUnit;
      trx.fiscalYear = userLoan.fiscalYear;
      trx.shiftWork = userLoan.shiftWork;
      trx.saleUnit = userLoan.saleUnit;
      trx.createdBy = current;
      trx.type = TransactionType.Deposit;
      trx.sourceType = TransactionSourceType.Loan;
      trx.description = dto.description;
      trx.amount = userLoan.amount;
      trx.title = loan.title;
      trx.meta = {
        rate: loan.interestRate
      };
      trx = await this.transactionService.doTransaction(
        trx,
        false,
        manager,
        -trx.amount,
        true
      );
      trx.credit = trx.user.credit;
      trx = await trx.save();
      this.eventEmitter.emit(EventsConstant.TRANSACTION_DEPOSIT, [
        trx,
        userLoan.amount
      ]);
      this.eventEmitter.emit(EventsConstant.LOAN_ADD, userLoan);
      console.log('-------------------credit-----------------------');
      this.eventEmitter.emit(EventsConstant.USER_ACTIVITY);
      return [userLoan, trx.user?.credit];
    });
  }

  async update(
    id: number,
    dto: UserLoanDto,
    current: User
  ): Promise<[UserLoan, number]> {
    return this.ds.manager.transaction(async (manager) => {
      let userLoan: UserLoan = await manager.findOne(UserLoan, {
        where: { id: id },
        relations: ['loan', 'items']
      });
      let old = { ...userLoan };
      if (!userLoan) {
        throw new BadRequestException('Not found loan');
      }
      let loan = userLoan.loan;
      if (userLoan.payedAmount > 0) {
        if (userLoan.loanId != dto.loan) {
          throw new BadRequestException('Unable changed loan');
        }
      }
      if (userLoan.loanId != dto.loan) {
        loan = await manager.findOne(Loan, { where: { id: dto.loan } });
        if (!loan) {
          throw new BadRequestException('Not found loan');
        }
      }
      if (
        userLoan.payedAmount > 0 &&
        (userLoan.amount != dto.amount || loan.installments != dto.installments)
      ) {
        throw new BadRequestException('Unable changed amount or installments');
      }
      if (userLoan.amount != dto.amount && !loan.freeAmount) {
        throw new BadRequestException('Invalid loan amount');
      }
      if (userLoan.installments != dto.installments && !loan.freeInstallments) {
        throw new BadRequestException('Invalid loan installments count');
      }
      if (loan.bailTypes?.length) {
        if (loan.bailTypes.indexOf(userLoan.bailType) < 0) {
          throw new BadRequestException('Invalid bail type');
        }
        if (userLoan.bailType == BailType.Cheque) {
          userLoan.cheque = await this.validateChequeBail(dto.cheque, manager);
        } else if (userLoan.bailType == BailType.User) {
          userLoan.user = await this.validateUserBail(dto.userBail);
        } else if (
          userLoan.bailType == BailType.PaySlip ||
          userLoan.bailType == BailType.BillOfExchange
        ) {
          userLoan.doc = await this.validateDocumentBail(
            dto.bailType,
            dto.doc,
            manager
          );
        }
      }

      if (dto.items.length != dto.installments) {
        throw new BadRequestException('Invalid installments');
      }
      if (userLoan.installments != dto.installments) {
        userLoan.items = [];
        for (let item of dto.items) {
          let installmentLoan = new InstallmentLoan();
          installmentLoan.amount = Math.round(item.amount);
          installmentLoan.payTime = moment(
            item.payTime,
            AppConstant.DATE_FORMAT
          ).toDate();
          installmentLoan.description = item.description;
          if (item.cheque) {
            installmentLoan.cheque = await manager.findOne(Cheque, {
              where: { id: item.cheque }
            });
            if (!installmentLoan.cheque) {
              throw new BadRequestException('Invalid installments cheque');
            }
          }
          userLoan.items.push(installmentLoan);
        }
      } else {
        for (let item of userLoan.items) {
          if (!item.payedTime) {
            let installmentLoan = dto.items?.find(
              (itemDto) => itemDto.id == item.id
            );
            if (installmentLoan) {
              item.payTime = moment(
                installmentLoan.payTime,
                AppConstant.DATE_FORMAT
              ).toDate();
              item.description = installmentLoan.description;
              if (installmentLoan.cheque) {
                if (installmentLoan.cheque != item.chequeId) {
                  item.cheque = await manager.findOne(Cheque, {
                    where: { id: installmentLoan.cheque }
                  });
                  if (!installmentLoan.cheque) {
                    throw new BadRequestException(
                      'Invalid installments cheque'
                    );
                  }
                }
              } else {
                item.cheque = undefined;
              }
            }
          }
        }
      }
      userLoan.installments = dto.installments;
      let trxResult;
      if (userLoan.amount != dto.amount) {
        let amount = dto.amount - userLoan.amount;
        let trx = await manager.findOne(Transaction, {
          where: { source: userLoan.id }
        });
        trx.description = dto.description;
        trx.amount = dto.amount;
        trx.title = loan.title;
        trx.meta = {
          rate: loan.interestRate
        };
        trxResult = await this.transactionService.doTransaction(
          trx,
          false,
          manager,
          -amount,
          true
        );
        trx.credit = trxResult.user.credit;
        trxResult = await trx.save();
        this.eventEmitter.emit(EventsConstant.TRANSACTION_DEPOSIT, [
          trx,
          amount
        ]);
        this.eventEmitter.emit(EventsConstant.USER_ACTIVITY);
      }
      userLoan.amount = dto.amount;
      userLoan.updatedBy = current;
      userLoan = await manager.save(userLoan);
      this.eventEmitter.emit(EventsConstant.LOAN_UPDATE, [old, userLoan]);
      return [userLoan, trxResult?.user?.credit];
    });
  }

  async remove(id: number, current: User) {
    return this.ds.manager.transaction(async (manager) => {
      let loan: UserLoan = await manager.findOne(UserLoan, {
        where: { id: id },
        relations: { items: { transactions: true } }
      });
      if (!loan) {
        throw new BadRequestException('Not found loan');
      }
      if (loan.items.find((e) => e.transactions.length > 0)) {
        throw new BadRequestException('Unable remove loan');
      }
      if (loan.payedAmount > 0) {
        throw new BadRequestException('Unable remove loan');
      }
      loan.deletedBy = current;
      loan.deletedAt = new Date();
      loan = await manager.save(loan);
      let trx = await manager.findOne(Transaction, {
        where: { source: loan.id }
      });
      this.eventEmitter.emit(EventsConstant.TRANSACTION_REMOVE_LOAN, trx);
      this.eventEmitter.emit(EventsConstant.LOAN_REMOVE, loan);
      return true;
    });
  }

  async findInstallmentTimeoutForDashboard() {
    let setting: LoanNotificationConfigDto = await this.settingService.get(
      SettingKey.LoanNotificationConfig
    );
    return InstallmentLoan.createQueryBuilder('q')
      .innerJoinAndSelect('q.loan', 'loan')
      .leftJoinAndSelect('loan.user', 'user')
      .where({
        payedTime: IsNull(),
        payTime: MoreThanOrEqual(
          moment()
            .utc(true)
            .add(setting?.showDashboardTimeoutAsDay || 2, 'day')
            .format(AppConstant.DATE_FORMAT)
        )
      })
      .getMany();
  }

  async findUserInstallmentTimeoutForDashboard(user: User) {
    let setting: LoanNotificationConfigDto = await this.settingService.get(
      SettingKey.LoanNotificationConfig
    );
    return InstallmentLoan.createQueryBuilder('q')
      .innerJoinAndSelect('q.loan', 'loan')
      .where({
        payedTime: IsNull(),
        payTime: MoreThanOrEqual(
          moment()
            .utc(true)
            .add(setting?.showDashboardTimeoutAsDay || 2, 'day')
            .format(AppConstant.DATE_FORMAT)
        ),
        loan: {
          user: {
            id: user.id
          }
        }
      })
      .getMany();
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async installmentTimeout() {
    let setting: LoanNotificationConfigDto = await this.settingService.get(
      SettingKey.LoanNotificationConfig
    );
    let loans = await InstallmentLoan.createQueryBuilder('q')
      .innerJoinAndSelect('q.loan', 'loan')
      .leftJoinAndSelect('loan.user', 'user')
      .where({
        payedTime: IsNull(),
        payTime: MoreThanOrEqual(
          moment()
            .utc(true)
            .add(setting?.installmentTimeoutAsDay || 2, 'day')
            .format(AppConstant.DATE_FORMAT)
        ),
        notification: LessThan(setting?.repeat || 1)
      })
      .getMany();
    for (let loan of loans) {
      this.eventEmitter.emit(EventsConstant.LOAN_INSTALLMENT_TIMEOUT, loan);
    }
  }

  async validateChequeBail(chequeId: number, manager?: EntityManager) {
    if (!chequeId) {
      throw new BadRequestException('Invalid cheque bail');
    }
    manager ||= this.ds.manager;
    let cheque = await manager.findOne(Cheque, { where: { id: chequeId } });
    if (!cheque) {
      throw new BadRequestException('Invalid cheque bail');
    }
    return cheque;
  }

  async validateUserBail(userId: number, manager?: EntityManager) {
    if (!userId) {
      throw new BadRequestException('Invalid user bail');
    }
    manager ||= this.ds.manager;
    let user = await manager.findOne(User, { where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Invalid user bail');
    }
    return user;
  }

  async validateDocumentBail(
    type: BailType,
    docId: number,
    manager?: EntityManager
  ) {
    if (!docId) {
      throw new BadRequestException('Invalid doc bail');
    }
    manager ||= this.ds.manager;
    let doc = await manager.findOne(Document, { where: { id: docId } });
    if (!doc) {
      throw new BadRequestException('Invalid doc bail');
    }
    return doc;
  }

  async getUserLoansList(userId: number, orderId: number) {
    const query = await UserLoan.createQueryBuilder('loan')
      //.select(['id, user, order'])
      .where({ user: userId })
      .orderBy('loan.id', 'ASC');

    if (orderId) {
      query.andWhere('loan.order= :id', { id: orderId });
    }

    return query.getRawMany();
  }

  async getFirstNotPaidInstallmentLoan(userId: number, orderId: number) {
    let userLoan = await this.getUserLoansList(userId, orderId);

    if (userLoan) {
      const query = await InstallmentLoan.createQueryBuilder('q')
        .select(['q.id id', 'q.amount amount'])
        .addSelect('q.payTime', 'payTime')
        //.leftJoin('q.transactions', '_transaction')
        .leftJoin(
          'Transaction',
          '_transaction',
          '_transaction.installment=q.id'
        )
        .addSelect('sum(coalesce(_transaction.amount, 0))', 'notPaidAmount')
        .leftJoin('UserLoan', '_userloan', 'q.loan=_userloan.id')
        .addSelect('_userloan.user', 'user')
        .addSelect('_userloan.order', 'order')
        //.addSelect("'action'", "type")
        .where('_userloan.user = :userId', { userId })
        .andWhere('_userloan.order= :orderId', { orderId })
        .andHaving('q.amount - sum(coalesce(_transaction.amount, 0)) > 0')
        .groupBy('q.id, _userloan.user, _userloan.order')
        .orderBy('q.id', 'ASC')
        .getRawMany();
      // if(orderId){
      // }

      return query[0];
    }

    return null;

    //.where({
    // payTime: MoreThanOrEqual(
    //   moment()
    //     .utc(true)
    //     .add(2, 'day')
    //     .format(AppConstant.DATE_FORMAT)
    // ),
    //})
  }
}
