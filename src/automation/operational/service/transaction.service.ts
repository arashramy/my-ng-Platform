import { User } from '../../../base/entities/User';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Between,
  DataSource,
  EntityManager,
  In,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not
} from 'typeorm';
import { Transaction, TransactionType } from '../entities/Transaction';
import {
  TransactionDto,
  TransactionReportTotalBaseUser,
  WithdrawDto
} from '../dto/transaction.dto';
import moment from 'moment';
import { SaleOrder } from '../entities/SaleOrder';
import { AppConstant } from '../../../common/constant/app.constant';
import { OrganizationUnit } from '../../../base/entities/OrganizationUnit';
import { FiscalYear } from '../../../base/entities/FiscalYears';
import { ShiftWorkService } from '../../../base/service/shift-work.service';
import { Operation } from '../../../common/interceptors/access-organization-fiscal-year.interceptor';
import { TransactionSourceType } from '../../../base/entities/TransactionSource';
import { TransactionItem } from '../dto/sale-order.dto';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { Cheque } from '../../../treasury/entities/Cheque';
import { DiscountService } from '../../../crm/service/discount.service';
import { ChargingServiceProvider } from './charging-service.service';
import { Bank } from '../../../base/entities/Bank';
import { CashDesk } from '../../../base/entities/CashDesk';
import { SaleItem } from '../entities/SaleItem';
import { UserLoan } from '../entities/UserLoan';
import { WalletGiftService } from './wallet-gift.service';
import { ShiftWork } from '../../../base/entities/ShiftWork';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';
import { InstallmentLoan } from '../entities/InstallmentLoan';
import { plainToInstance } from 'class-transformer';
import { ExcelService } from '../../../common/export/ExcelService';
import { getExportOptions } from '../../../common/decorators/export.decorator';

@Injectable()
export class TransactionService {
  constructor(
    private datasource: DataSource,
    private shiftWorkService: ShiftWorkService,
    private discountService: DiscountService,
    private chargingService: ChargingServiceProvider,
    private walletGiftService: WalletGiftService,
    private eventEmitter: EventEmitter2,
    private readonly excelService: ExcelService
  ) {}

  async settleInstallmentLoan(
    transactionsDto: TransactionItem[],
    installmentLoan: InstallmentLoan,
    userLoan: UserLoan,
    saleUnit: SaleUnit,
    current: User,
    submitAt?: any,
    manager?: EntityManager
  ) {
    const transactions: Transaction[] = [];
    const now = new Date();
    let sum = 0;
    for (const trxDto of transactionsDto) {
      if (trxDto.amount > 0) {
        let trx = new Transaction();
        trx.type = TransactionType.Settle;
        if (userLoan.shiftWork.id)
          trx.shiftWork = {
            id: userLoan.shiftWork.id
          } as ShiftWork;
        trx.organizationUnit = {
          id: userLoan.organizationUnit?.id || userLoan.organizationUnitId
        } as OrganizationUnit;
        trx.fiscalYear = {
          id: userLoan.fiscalYearId || userLoan.fiscalYear.id
        } as FiscalYear;
        trx.submitAt = new Date(submitAt);
        trx.amount = 0;
        trx.saleUnit = saleUnit;
        trx.installmentLoan = installmentLoan;
        trx.createdBy = current;
        trx.sourceType = trxDto.type;
        trx.description = trxDto.description || 'تسویه وام';
        trx.user = { id: trxDto.user || userLoan.user.id } as User;
        const amount = trxDto.amount - trx.amount;
        console.log('Transaction type', trxDto.type);
        if (trxDto.type === TransactionSourceType.UserCredit) {
          trx = await this.doTransaction(trx, true, manager, amount);
          trx.title = TransactionSourceType[TransactionSourceType.UserCredit];
        }
        if (trxDto.type == TransactionSourceType.ChargingService) {
          trx = await this.chargeServiceTransaction(trxDto, trx, manager);
          trx.description = `تسویه وام (${userLoan?.id})`;
        } else if (trxDto.type == TransactionSourceType.OfferedDiscount) {
          trx = await this.discountTransaction(trxDto, trx, manager);
        } else if (trxDto.type == TransactionSourceType.Cheque) {
          trx = await this.chequeTransaction(trxDto, trx);
        } else if (trxDto.type == TransactionSourceType.Bank) {
          trx = await this.bankTransaction(trxDto, trx);
        } else if (trxDto.type == TransactionSourceType.CashDesk) {
          trx = await this.cashTransaction(trxDto, trx);

        }
        trx.amount = trxDto.amount;

        trx.credit = trx.user.credit;
        trx.meta = trxDto.meta;
        sum += trx.amount || 0;
        transactions.push(trx);
      }
    }

    if (transactions.length) {
      await manager.save(transactions);
    }
    for (const trx of transactions) {
      if (
        trx.sourceType == TransactionSourceType.UserCredit &&
        trx.submitAt?.getTime() < now.getTime()
      ) {
        await this.normalizeTransactionAfterDate(
          trx.user.id,
          trx.submitAt,
          current,
          manager
        );
      } else if (trx.submitAt.getDate() > now.getDate()) {
        throw new BadRequestException('Invalid submit date format');
      } else if (
        trx.sourceType == TransactionSourceType.ChargingService &&
        trx.submitAt?.getTime() < now.getTime()
      ) {
        await this.normalizeChargeRemainCreditTransactionAfterDate(
          trx.user.id,
          trx.submitAt,
          current,
          trx.source,
          manager
        );
      }
    }

    return transactions;
  }

  async settleSaleOrder(
    transactionsDto: TransactionItem[],
    order: SaleOrder,
    saleUnit: SaleUnit,
    current: User,
    editOrder = false,
    manager?: EntityManager
  ) {
    const oldTransactions = editOrder
      ? await Transaction.find({ where: { order: { id: order.id } } })
      : [];
    let transactions: Transaction[] = [];
    const now = new Date();

    const events = [];
    let sum = 0;
    for (const trxDto of transactionsDto) {
      if (trxDto.amount > 0) {
        let trx: Transaction = oldTransactions?.find((t) => t.id == trxDto.id);
        if (!trx) {
          if (trxDto.id) {
            trx = await Transaction.findOne({ where: { id: trxDto.id } });
          } else {
            trx = new Transaction();
            trx.type = TransactionType.Settle;
            trx.order = order;
            if (order.shiftWorkId || order.shiftWork?.id)
              trx.shiftWork = {
                id: order.shiftWorkId || order.shiftWork.id
              } as ShiftWork;
            trx.organizationUnit = {
              id: order.organizationUnitId || order.organizationUnit.id
            } as OrganizationUnit;
            trx.fiscalYear = {
              id: order.fiscalYearId || order.fiscalYear.id
            } as FiscalYear;

            let submitAt;
            if (
              moment(
                moment(trxDto.submitAt, AppConstant.SUBMIT_TIME_FORMAT).toDate()
              ).isValid()
            ) {
              submitAt = moment(
                trxDto.submitAt,
                AppConstant.SUBMIT_TIME_FORMAT
              ).toDate();
            } else if (moment(moment(order.submitAt).toDate()).isValid()) {
              submitAt = moment(order.submitAt).toDate();
            } else {
              submitAt = moment().toDate();
            }
            trx.submitAt = submitAt;
            trx.amount = 0;
            trx.saleUnit = saleUnit;
            trx.createdBy = current;
          }
        }
        const des = order.items
          .filter((e) => e.deletedAt === null)
          .map((el) => el.title);
        trx.description = trxDto.description || des.toString();
        console.log(
          '----trx.amount != trxDto.amount------------------------',
          trx.amount != trxDto.amount
        );
        if (trx.amount != trxDto.amount) {
          trx.sourceType = trxDto.type;
          if (trxDto.user == (order?.user?.id || order?.userId)) {
            trx.user = order.user || ({ id: order?.userId } as User);
          } else {
            trx.user = { id: trxDto.user } as User;
          }
          console.log('trxDto.source------------------', trxDto.source);
          console.log('trxDto.type------------------', trxDto.type);
          if (trxDto.source) {
            if (trxDto.type == TransactionSourceType.ChargingService) {
              trx = await this.chargeServiceTransaction(trxDto, trx, manager);
            } else if (trxDto.type == TransactionSourceType.OfferedDiscount) {
              trx = await this.discountTransaction(trxDto, trx, manager);
            } else if (trxDto.type == TransactionSourceType.Cheque) {
              trx = await this.chequeTransaction(trxDto, trx);
            } else if (trxDto.type == TransactionSourceType.Bank) {
              console.log(
                '-----------------------bank------------------------'
              );
              trx = await this.bankTransaction(trxDto, trx);
            } else if (trxDto.type == TransactionSourceType.CashDesk) {
              trx = await this.cashTransaction(trxDto, trx);
            }
            console.log(88);
            sum += trx.amount || 0;
            transactions.push(trx);
            events.push({
              channel: `${EventsConstant.TRANSACTION_SETTLE}${trxDto.type}`,
              data: [trx, trx.amount]
            });
          } else if (trxDto.type == TransactionSourceType.UserCredit) {
            const amount = trxDto.amount - trx.amount;
            console.log('called user credit');
            trx = await this.doTransaction(trx, true, manager, amount);
            trx.amount = trxDto.amount;
            trx.title = TransactionSourceType[TransactionSourceType.UserCredit];
            trx.credit = trx.user.credit;
            sum += trx.amount || 0;
            transactions.push(trx);
            events.push({
              channel: `${EventsConstant.TRANSACTION_SETTLE}${trxDto.type}`,
              data: [trx, amount]
            });
          }
        } else {
          sum += trx.amount || 0;
        }
      }
    }
    let walletTrx;
    for (const trx of oldTransactions || []) {
      const trxDto = transactionsDto?.find((t) => t.id == trx.id);
      if (!trxDto) {
        const result = await this.doRemoveTransaction(
          trx,
          false,
          current,
          false,
          manager
        );
        if (result) {
          events.push({
            channel: `${EventsConstant.TRANSACTION_REMOVE}${trx.sourceType}`,
            data: result
          });
        }
        if (trx.sourceType == TransactionSourceType.UserCredit) {
          walletTrx = trx;
        }
      }
    }
    if (walletTrx) {
      await this.normalizeTransactionAfterDate(
        walletTrx.user?.id || walletTrx.userId,
        walletTrx.submitAt,
        current,
        manager
      );
    }
    if (transactions.length) {
      await manager.save(transactions);
    }
    order.settleAmount = sum;
    await manager.save(order);
    order.transactions = transactions;
    for (const trx of transactions) {
      if (
        trx.sourceType == TransactionSourceType.UserCredit &&
        trx.submitAt?.getTime() < now.getTime()
      ) {
        await this.normalizeTransactionAfterDate(
          trx.user.id,
          trx.submitAt,
          current,
          manager
        );
      } else if (trx.submitAt?.getDate() > now.getDate()) {
        throw new BadRequestException('Invalid submit date format');
      } else if (
        trx.sourceType == TransactionSourceType.ChargingService &&
        trx.submitAt?.getTime() < now.getTime()
      ) {
        await this.normalizeChargeRemainCreditTransactionAfterDate(
          trx.user.id,
          trx.submitAt,
          current,
          trx.source,
          manager
        );
      }
    }
    for (const event of events) {
      this.eventEmitter.emitAsync(event.channel, event.data);
    }

    await this.eventEmitter.emitAsync(
      EventsConstant.TRANSACTION_WITHDRAW,
      transactions
    );
    this.eventEmitter.emit(EventsConstant.USER_ACTIVITY);
    return transactions;
  }

  async removeTransaction(id: number, current: User) {
    return this.datasource.manager.transaction(async (entityManager) => {
      const trx = await entityManager.findOne(Transaction, {
        where: { id: id },
        relations: ['user']
      });
      if (!trx) {
        throw new BadRequestException('Not found transaction');
      }
      return this.doRemoveTransaction(trx, true, current, true, entityManager);
    });
  }

  async doRemoveTransaction(
    trx: Transaction,
    updateOrderSettle = false,
    current: User,
    normalize = true,
    manager?: EntityManager
  ) {
    let wallet = false;
    console.log('type transaction', trx.type);
    console.log('sourceType transaction', trx.sourceType);

    if (trx.type == TransactionType.Settle) {
      switch (trx.sourceType) {
        case TransactionSourceType.Bank:
        case TransactionSourceType.CashDesk:
        case TransactionSourceType.OfferedDiscount:
          break;
        case TransactionSourceType.Cheque:
          await manager.update(
            Cheque,
            { id: trx.source },
            {
              deletedAt: new Date(),
              deletedBy: current
            }
          );
          break;
        case TransactionSourceType.ChargingService:
          await manager.update(
            SaleItem,
            { id: trx.source },
            {
              usedCredit: () => `used_credit + (${-trx.amount})`
            }
          );
          break;
        case TransactionSourceType.UserCredit:
          await this.doTransaction(trx, false, manager, -trx.amount, false);
          wallet = true;
      }
      if (updateOrderSettle) {
        await manager.update(
          SaleOrder,
          { id: trx.orderId || trx.order?.id },
          {
            settleAmount: () => `settle_amount + (${-trx.amount})`
          }
        );
      }
    } else if (trx.type == TransactionType.Deposit) {
      switch (trx.sourceType) {
        case TransactionSourceType.Loan:
          await manager.update(
            UserLoan,
            { id: trx.source },
            { deletedAt: new Date(), deletedBy: current }
          );
        case TransactionSourceType.ChargingService:
          await manager.update(
            SaleItem,
            { id: trx.source },
            {
              usedCredit: () => `used_credit + (${-trx.amount})`
            }
          );
          break;
      }
      await this.doTransaction(trx, true, manager, trx.amount, false);
      wallet = true;
    } else {
      await this.doTransaction(trx, false, manager, -trx.amount, false);
      wallet = true;
    }
    trx.deletedBy = current;
    trx.deletedAt = new Date();
    await manager.save(trx);
    if (wallet && normalize) {
      await this.normalizeTransactionAfterDate(
        trx.user?.id || trx.userId,
        trx.submitAt,
        current,
        manager
      );
    }

    if (trx.sourceType === TransactionSourceType.ChargingService) {
      await this.normalizeChargeRemainCreditTransactionAfterDate(
        trx.user?.id || trx.userId,
        trx.submitAt,
        current,
        trx.source,
        manager
      );
    }
    return trx;
  }

  async chargeServiceTransaction(
    trxDto: TransactionItem,
    trx: Transaction,
    manager?: EntityManager
  ) {
    console.log('calledchargeServiceTransaction');
    let results;
    if (trxDto.isArchived) {
      results = await this.chargingService.getChargingForArchived(
        trxDto.source,
        trxDto.amount,
        manager
      );
    } else {
      results = await this.chargingService.getCharging(
        trxDto.source,
        trx.user?.id,
        trx?.organizationUnit?.id || trx.order?.organizationUnitId,
        trx.saleUnit.id,
        trx.submitAt,
        trx?.id,
        trx.order?.items,
        manager,
        trxDto.fromGuest
      );
    }
    const [chargingService, amountValue, description] = results;
    if (trx.id) {
      const amount = trxDto.amount - trx.amount;
      chargingService.usedCredit += amount;
      trx.description = trx.description
        ? trx.description + '(' + description + ')'
        : description;
      trx.title = chargingService.title;
      trx.credit = chargingService.credit - chargingService.usedCredit;
      trx.chargeRemainCredit =
        chargingService.credit - chargingService.usedCredit;
      await manager.save(chargingService);
      return trx;
    } else {
      if (amountValue > 0) {
        if (amountValue >= trxDto.amount) {
          trx.amount = trxDto.amount;
          trx.source = trxDto.source;
          trx.description = trx.description
            ? trx.description + '(' + description + ')'
            : description;
          chargingService.usedCredit += trxDto.amount;
          trx.title = chargingService.title;
          trx.credit = chargingService.credit - chargingService.usedCredit;
          trx.chargeRemainCredit =
            chargingService.credit - chargingService.usedCredit;
          await manager.save(chargingService);
          return trx;
        }
      }
    }
    console.log('hi');
    throw new BadRequestException('Invalid charging service');
  }

  async discountTransaction(
    trxDto: TransactionItem,
    trx: Transaction,
    manager?: EntityManager
  ) {
    const [discount, amountValue, description] =
      await this.discountService.getDiscountAmount(
        trxDto.source,
        trxDto.code,
        trx.order?.user?.id || trx.order?.userId,
        trx.order?.organizationUnit?.id || trx.order?.organizationUnitId,
        trx.saleUnit.id,
        trx.order.submitAt,
        trx?.id,
        trx.order?.items,
        manager
      );
    if (amountValue > 0) {
      trx.amount = trxDto.amount;
      trx.source = trxDto.source;
      trx.title = discount.title;
      trx.description = trx.description
        ? trx.description + '(' + description + ')'
        : description;
    } else {
      throw new BadRequestException('Invalid discount');
    }
    return trx;
  }

  async bankTransaction(trxDto: TransactionItem, trx: Transaction) {
    if (!trx.id || trx.source != trxDto.source) {
      const bank = await Bank.findOne({ where: { id: trxDto.source } });
      if (!bank) {
        throw new BadRequestException('Not found bank');
      }
      trx.source = trxDto.source;
      trx.title = bank.title;
      // trx.reference = trxDto.reference;
      trx.meta = {
        bank: bank.bank
      };
    }
    trx.amount = trxDto.amount;
    return trx;
  }

  async cashTransaction(trxDto: TransactionItem, trx: Transaction) {
    if (!trx.id || trx.source != trxDto.source) {
      const cashDesk = await CashDesk.findOne({ where: { id: trxDto.source } });
      if (!cashDesk) {
        throw new BadRequestException('Not found cash desk');
      }
      trx.source = trxDto.source;
      trx.title = cashDesk.title;
    }
    trx.amount = trxDto.amount;
    return trx;
  }

  async chequeTransaction(trxDto: TransactionItem, trx: Transaction) {
    if (!trx.id || trx.source != trxDto.source) {
      const cheque = await Cheque.findOne({
        where: { id: trxDto.source, user: { id: trxDto.user } }
      });
      if (!cheque) {
        throw new BadRequestException('Not found chque');
      }
      trx.source = trxDto.source;
      trx.title = cheque.bank;
      trx.meta = {
        number: cheque.number,
        date: cheque.date,
        amount: cheque.amount,
        bank: cheque.bank
      };
      trx.amount = trxDto.amount;
    }
    return trx;
  }

  async giftTransaction(
    withoutChequePrice: number,
    price: number,
    organizationUnit: OrganizationUnit,
    user: User,
    manager?: EntityManager
  ) {
    const [gift, giftAmount] = await this.walletGiftService.get(
      withoutChequePrice,
      price,
      organizationUnit.id,
      manager
    );
    if (giftAmount > 0) {
      const trx: Transaction = new Transaction();
      trx.type = TransactionType.Deposit;
      trx.source = gift.id;
      trx.sourceType = TransactionSourceType.WalletGift;
      trx.organizationUnit = organizationUnit;
      trx.amount = giftAmount;
      trx.title =
        gift.title || TransactionSourceType[TransactionSourceType.WalletGift];
      trx.meta = {
        price: price
      };
      trx.user = user;

      return trx;
    }
    return null;
  }

  async deposit(transactionDto: TransactionDto, byGift = false, current: User) {
    return this.datasource.manager.transaction(async (manager) => {
      const now = moment().format(AppConstant.SUBMIT_TIME_FORMAT);
      let submitAt;
      if (!transactionDto.submitAt) {
        submitAt = now;
      } else {
        const submitAtMoment = moment(
          transactionDto.submitAt,
          AppConstant.SUBMIT_TIME_FORMAT
        );
        if (!submitAtMoment.isValid() || submitAtMoment.isAfter(moment())) {
          throw new BadRequestException('Invalid submit date format');
        }
        submitAt = submitAtMoment.toDate();
      }
      let saleUnit;
      try {
        saleUnit = await manager.findOneOrFail(SaleUnit, {
          where: { id: transactionDto.saleUnit },
          cache: true
        });
      } catch (e) {
        throw new BadRequestException('Sale unit not found');
      }
      const [organizationUnit, fiscalYear] =
        this.processOperation(transactionDto);
      const shift = await this.shiftWorkService.findBy(
        submitAt,
        organizationUnit?.id
      );
      if (!shift) {
        throw new BadRequestException('Invalid shift work');
      }
      let user;
      try {
        user = await manager.findOneOrFail(User, {
          where: { id: transactionDto.user },
          cache: true
        });
      } catch (e) {
        throw new BadRequestException('User not found');
      }

      const result = await this.doDeposit(
        transactionDto,
        saleUnit,
        organizationUnit,
        fiscalYear,
        shift,
        user,
        submitAt,
        byGift,
        moment(submitAt).isBefore(now),
        current,
        manager
      );
      await this.eventEmitter.emitAsync(
        EventsConstant.TRANSACTION_DEPOSIT,
        result
      );
      this.eventEmitter.emit(EventsConstant.USER_ACTIVITY);
      return result;
    });
  }

  async doDeposit(
    transactionDto: TransactionDto,
    saleUnit: SaleUnit,
    organizationUnit: OrganizationUnit,
    fiscalYear: FiscalYear,
    shift: ShiftWork,
    user: User,
    submitAt: Date,
    byGift = false,
    normalize = false,
    current: User,
    manager?: EntityManager
  ) {
    manager ||= this.datasource.manager;
    let sum = 0;
    let totalWithoutCheque = 0;
    let transactions = [];
    let chargeRemainCreditSources = [];
    console.log('=trxDto.type', transactionDto, byGift);

    for (const trxDto of transactionDto.items) {
      let trx = new Transaction();
      trx.type = TransactionType.Deposit;
      trx.description =
        byGift && !trxDto.description ? 'شارژ کیف پول' : trxDto.description;
      trx.sourceType = trxDto.type;
      trx.user = user;
      if (trxDto.amount > 0 && trxDto.source) {
        if (trxDto.type == TransactionSourceType.Cheque) {
          trx = await this.chequeTransaction(trxDto, trx);
        } else if (trxDto.type == TransactionSourceType.Bank) {
          trx = await this.bankTransaction(trxDto, trx);
          totalWithoutCheque += trx.amount || 0;
        } else if (trxDto.type == TransactionSourceType.CashDesk) {
          trx = await this.cashTransaction(trxDto, trx);
          totalWithoutCheque += trx.amount || 0;
        } else if (trxDto.type == TransactionSourceType.Archived) {
          trx.amount = trxDto.amount || 0;
          totalWithoutCheque += trx.amount || 0;
          trx.meta = trxDto.meta;
          trx.title = trxDto.title;
        } else if (trxDto.type === TransactionSourceType.ChargingService) {
          console.log('here we areeeeeeeeeeeeeeeee');
          trx.saleUnit = saleUnit;
          trx.organizationUnit = organizationUnit;
          trx = await this.chargeServiceTransaction(trxDto, trx, manager);
          console.log(99);
          totalWithoutCheque += trx.amount || 0;
          chargeRemainCreditSources.push(trx.source);
        }
        sum += trx.amount || 0;
        transactions.push(trx);
      }
    }

    if (byGift) {
      const giftTrx = await this.giftTransaction(
        totalWithoutCheque,
        sum,
        organizationUnit,
        user,
        manager
      );
      if (giftTrx) {
        transactions.push(giftTrx);
        sum += giftTrx.amount || 0;
      }
    }
    if (sum > 0) {
      let trxResult = new Transaction();
      trxResult.amount = sum * -1;
      trxResult.type = TransactionType.Deposit;
      trxResult.sourceType = TransactionSourceType.UserCredit;
      trxResult.user = user;
      trxResult = await this.doTransaction(trxResult, false, manager);
      if (trxResult) {
        let credit = trxResult.user.credit;
        for (const trx of transactions.reverse()) {
          trx.shiftWork = shift;
          trx.organizationUnit = organizationUnit;
          trx.fiscalYear = fiscalYear;
          trx.submitAt = submitAt;
          trx.createdBy = current;
          trx.saleUnit = saleUnit;
          trx.credit = credit;
          credit -= trx.amount;
        }
        transactions = await manager.save(transactions.reverse());
        if (normalize) {
          await this.normalizeTransactionAfterDate(
            user.id,
            submitAt,
            current,
            manager
          );
          for (const source of chargeRemainCreditSources) {
            await this.normalizeChargeRemainCreditTransactionAfterDate(
              user.id,
              submitAt,
              current,
              source,
              manager
            );
          }
        }
        return transactions;
      } else {
        throw new BadRequestException('Unable deposit!please try again');
      }
    }
    throw new BadRequestException('invalid amount');
  }

  async withdraw(transactionDto: WithdrawDto, current: User) {
    console.log('withdraaaawwwwwwwwwwwwwwwwww');
    return this.datasource.manager.transaction(async (manager) => {
      const now = new Date();
      if (transactionDto.amount <= 0) {
        throw new BadRequestException('Invalid amount');
      }
      const [organizationUnit, fiscalYear] =
        this.processOperation(transactionDto);
      let user;
      try {
        user = await manager.findOneOrFail(User, {
          where: { id: transactionDto.user },
          cache: true
        });
      } catch (e) {
        throw new BadRequestException('User not found');
      }
      let saleUnit;
      try {
        saleUnit = await manager.findOneOrFail(SaleUnit, {
          where: { id: transactionDto.saleUnit },
          cache: true
        });
      } catch (e) {
        throw new BadRequestException('Sale unit not found');
      }
      let submitAt;
      if (!transactionDto.submitAt) {
        submitAt = now;
      } else {
        const submitAtMoment = moment(
          transactionDto.submitAt,
          AppConstant.SUBMIT_TIME_FORMAT
        );
        if (!submitAtMoment.isValid() || submitAtMoment.isAfter(moment())) {
          throw new BadRequestException('Invalid submit date format');
        }
        submitAt = submitAtMoment.toDate();
      }
      const shift = await this.shiftWorkService.findBy(
        submitAt,
        organizationUnit?.id
      );
      if (!shift) {
        throw new BadRequestException('Invalid shift work');
      }
      console.log('check withdraw date', submitAt.getTime() < now.getTime());
      const result = await this.doWithdraw(
        transactionDto,
        saleUnit,
        organizationUnit,
        fiscalYear,
        shift,
        user,
        submitAt,
        false,
        submitAt.getTime() < now.getTime(),
        current,
        manager
      );
      await this.eventEmitter.emitAsync(
        EventsConstant.TRANSACTION_WITHDRAW,
        result
      );
      console.log('resulttt is', result);
      this.eventEmitter.emit(EventsConstant.USER_ACTIVITY);
      return result;
    });
  }

  async doWithdraw(
    trxDto: WithdrawDto,
    saleUnit: SaleUnit,
    organizationUnit: OrganizationUnit,
    fiscalYear: FiscalYear,
    shift: ShiftWork,
    user: User,
    submitAt: Date,
    dept = false,
    normalize = false,
    current: User,
    manager?: EntityManager
  ) {
    let trx = new Transaction();
    trx.type = TransactionType.Withdraw;
    trx.sourceType = TransactionSourceType.UserCredit;
    trx.user = user;
    trx.shiftWork = shift;
    trx.organizationUnit = organizationUnit;
    trx.fiscalYear = fiscalYear;
    trx.saleUnit = saleUnit;
    trx.submitAt = submitAt;
    trx.description = trxDto.description;
    trx.createdBy = current;
    trx.amount = trxDto.amount;
    trx.title = TransactionType[TransactionType.Withdraw];
    trx.credit = trx.user.credit;
    console.log("trx credit---------------------848",trx.credit)
    trx = await this.doTransaction(trx, dept, manager);
    trx = await manager.save(trx);
    console.log("trx credit---------------------851",trx.credit)

    if (normalize) {
      await this.normalizeTransactionAfterDate(
        user.id,
        submitAt,
        current,
        manager
      );
    }
    return trx;
  }

  async transfer(transactionDto: WithdrawDto, current: User) {
    return this.datasource.manager.transaction(async (manager) => {
      const now = new Date();
      let transaction: Transaction = new Transaction();
      transaction.type =
        transactionDto.amount > 0
          ? TransactionType.Withdraw
          : TransactionType.Deposit;
      try {
        transaction.saleUnit = await manager.findOneOrFail(SaleUnit, {
          where: { id: transactionDto.saleUnit },
          cache: true
        });
      } catch (e) {
        throw new BadRequestException('Sale unit not found');
      }
      const [organizationUnit, fiscalYear] =
        this.processOperation(transactionDto);
      transaction.fiscalYear = fiscalYear;
      transaction.organizationUnit = organizationUnit;
      try {
        transaction.user = await manager.findOneOrFail(User, {
          where: { id: transactionDto.user },
          cache: true
        });
      } catch (e) {
        throw new BadRequestException('User not found');
      }
      if (!transactionDto.submitAt) {
        transaction.submitAt = now;
      } else {
        const submitAt = moment(
          transactionDto.submitAt,
          AppConstant.SUBMIT_TIME_FORMAT
        );
        if (!submitAt.isValid() || submitAt.isAfter(moment())) {
          throw new BadRequestException('Invalid submit date format');
        }
        transaction.submitAt = submitAt.toDate();
      }
      const shift = await this.shiftWorkService.findBy(
        transaction.submitAt,
        transaction.organizationUnit?.id
      );
      if (!shift) {
        throw new BadRequestException('Invalid shift work');
      }
      transaction.sourceType = TransactionSourceType.Transfer;
      transaction.shiftWork = shift;
      transaction.amount = transactionDto.amount;
      transaction.createdBy = current;
      transaction.title =
        TransactionType[
          transactionDto.amount > 0
            ? TransactionType.Withdraw
            : TransactionType.Deposit
        ];
      transaction = await this.doTransaction(transaction, true, manager);
      transaction.credit = transaction.user.credit;
      transaction = await manager.save(transaction);
      if (transaction?.submitAt?.getTime() < now.getTime()) {
        await this.normalizeTransactionAfterDate(
          transaction.user.id,
          transaction?.submitAt,
          current,
          manager
        );
      }
      await this.eventEmitter.emitAsync(
        EventsConstant.TRANSACTION_TRANSFER,
        transaction
      );
      return transaction;
    });
  }

  async deleteAllByOrderId(
    order: number | SaleOrder,
    types: TransactionSourceType[],
    updateOrderSettle = false,
    refresh = false,
    current?: User,
    manager?: EntityManager
  ) {
    if (Number.isInteger(order)) {
      order = await manager.findOne(SaleOrder, {
        where: { id: order as any },
        relations: ['items', 'items.product', 'user']
      });
    }
    if (!order) {
      throw new BadRequestException('Not found order.');
    }

    // console.log("one condition",(order as SaleOrder).items.find((e) => e.isCashBack))
    (order as SaleOrder).items.find((e) => {
      console.log('e.isCashBack', e.isCashBack);
      return !!e.isCashBack;
    });
    if (!!(order as SaleOrder).items.find((e) => e.product.isCashBack)) {
      const isUsedcashBacksItems = await SaleOrder.find({
        where: {
          cashBackParent: { id: (order as SaleOrder).id },
          items: { isCashBack: true, usedCredit: Not(0) }
        },
        relations: { cashBackParent: true, items: true }
      });
      if (isUsedcashBacksItems.length > 0) {
        throw new BadRequestException(
          ' you use the cash back, you can not delete it '
        );
      } else {
        const cashBackOrders = await SaleOrder.find({
          where: {
            submitAt: (order as SaleOrder).submitAt,
            user: { id: (order as SaleOrder).user.id },
            items: { isCashBack: true, usedCredit: Not(0) }
          },

          relations: { user: true, items: true }
        });
        if (cashBackOrders.length > 0) {
          throw new BadRequestException(
            ' you use the cash back, you can not delete it '
          );
        }
      }
    }
    const where: any = { order: { id: (order as SaleOrder).id } };
    if (types?.length) {
      where['sourceType'] = In(types);
    }
    const events = [];
    const transactions = await manager.find(Transaction, {
      where: where,
      relations: ['user']
    });
    let walletTrx;
    for (const trx of transactions) {
      await this.doRemoveTransaction(
        trx,
        updateOrderSettle,
        current,
        false,
        manager
      );
      events.push({
        channel: `${EventsConstant.TRANSACTION_REMOVE}${trx.sourceType}`,
        data: trx
      });
      if (trx.sourceType == TransactionSourceType.UserCredit) {
        walletTrx = trx;
      }
    }
    if (walletTrx) {
      await this.normalizeTransactionAfterDate(
        walletTrx.user?.id || walletTrx.userId,
        walletTrx.submitAt,
        current,
        manager
      );
    }
    if (refresh) {
      this.eventEmitter.emit(EventsConstant.ORDER_DELETE_TRANSACTIONS, order);
    }
    return transactions;
  }

  async doTransaction(
    transaction: Transaction,
    dept?: boolean,
    manager?: EntityManager,
    amount?: number,
    returnCredit = true
  ) {
    const value = -(amount || transaction.amount);
    const query = manager
      .createQueryBuilder()
      .update(User)
      .set({ credit: () => 'credit + (' + value + ')' })
      .where({ id: transaction.user.id });
    if (value < 0) {
      if (dept) {
        query.andWhere(
          '(credit - :amount >= 0 OR ( authorizedDebtor IS TRUE AND credit + maxDeptAmount >= :amount))',
          { amount: value * -1 }
        );
      } else {
        query.andWhere({
          credit: MoreThanOrEqual(value * -1)
        });
      }
    }
    const updateResult = await query.execute();
    if (updateResult.affected > 0) {
      if (returnCredit) {
        transaction.user = await manager.findOne(User, {
          where: { id: transaction.user.id },
          select: ['credit', 'id'],
          cache: false
        });
      }
      return transaction;
    }
    throw new BadRequestException('Credit not enough');
  }

  processOperation(transactionDto: Operation): [OrganizationUnit, FiscalYear] {
    const organizationUnit = new OrganizationUnit();
    if (
      typeof transactionDto?.organizationUnit == 'number' ||
      typeof transactionDto?.organizationUnit == 'string'
    ) {
      organizationUnit.id = +transactionDto.organizationUnit;
    } else if ((transactionDto?.organizationUnit as OrganizationUnit)?.id) {
      organizationUnit.id = +transactionDto.organizationUnit?.id;
    }
    if (!organizationUnit.id) {
      throw new BadRequestException('Not found organization unit');
    }
    const fiscalYear = new FiscalYear();
    if (
      typeof transactionDto?.fiscalYear == 'number' ||
      typeof transactionDto?.fiscalYear == 'string'
    ) {
      fiscalYear.id = +transactionDto.fiscalYear;
    } else if ((transactionDto?.fiscalYear as FiscalYear)?.id) {
      fiscalYear.id = +transactionDto.fiscalYear?.id;
    }

    if (!fiscalYear.id) {
      throw new BadRequestException('Not found fiscal year');
    }
    return [organizationUnit, fiscalYear];
  }

  async normalizeChargeRemainCreditTransactionAfterDate(
    user: number,
    submitAt: Date,
    current: User,
    source: number,
    manager: EntityManager
  ) {
    console.log('callednormalizeChargeRemainCreditTransactionAfterDate');
    const chargingService = await manager.findOne(SaleItem, {
      where: { id: source }
    });
    const lastTransactions = await manager.find(Transaction, {
      where: {
        submitAt: LessThan(submitAt),
        user: { id: user },
        // type: TransactionType.Deposit,
        source: source
      },
      order: {
        submitAt: 'DESC',
        id: 'DESC'
      },
      take: 1
    });
    const lastTransaction: any = lastTransactions.length
      ? {
          ...lastTransactions[0],
          chargeRemainCredit:
            lastTransactions[0].type === TransactionType.Deposit
              ? lastTransactions[0].chargeRemainCredit
              : lastTransactions[0].chargeRemainCredit
        }
      : {
          chargeRemainCredit: chargingService.credit,
          submitAt: moment(chargingService.submitAt),
          id: 0
        };
    const transactions = await manager.find(Transaction, {
      where: {
        submitAt: MoreThan(lastTransaction.submitAt),
        user: { id: user },
        id: Not(lastTransaction?.id),
        // type: TransactionType.Deposit,

        source: source
      },
      order: {
        submitAt: 'ASC',
        id: 'ASC'
      },
      relations: { user: true }
    });

    let lastCredit = +lastTransaction?.chargeRemainCredit || 0;
    console.log('lastCredit', lastCredit);
    console.log('transacctions', transactions.length);

    for (const trx of transactions) {
      console.log(trx.amount, lastCredit);
      lastCredit -= +(trx.amount || 0);
      trx.chargeRemainCredit = lastCredit;
      trx.updatedBy = current;
      trx.createdAt = new Date();
    }
    await manager.save(transactions);
  }

  async normalizeTransactionAfterDate(
    user: number,
    submitAt: Date,
    current: User,
    manager: EntityManager
  ) {
    const lastTransactions = await manager.find(Transaction, {
      where: [
        {
          submitAt: LessThan(submitAt),
          user: { id: user },
          type: In([TransactionType.Withdraw, TransactionType.Deposit])
        },
        {
          submitAt: LessThan(submitAt),
          user: { id: user },
          sourceType: TransactionSourceType.UserCredit
        }
      ],
      order: {
        submitAt: 'DESC',
        id: 'DESC'
      },
      take: 1
    });
    const lastTransaction: any = lastTransactions.length
      ? lastTransactions[0]
      : {
          credit: 0,
          submitAt: new Date(0),
          id: 0
        };
    const transactions = await manager.find(Transaction, {
      where: [
        {
          submitAt: MoreThan(lastTransaction.submitAt),
          user: { id: user },
          id: Not(lastTransaction?.id),
          type: In([TransactionType.Withdraw, TransactionType.Deposit])
        },
        {
          submitAt: MoreThan(lastTransaction.submitAt),
          user: { id: user },
          id: Not(lastTransaction?.id),
          sourceType: TransactionSourceType.UserCredit
        }
      ],
      order: {
        submitAt: 'ASC',
        id: 'ASC'
      }
    });
    let lastCredit = +lastTransaction?.credit || 0;
    console.log("lastCredit",lastCredit)
    for (const trx of transactions) {
      if (trx.type == TransactionType.Settle || trx.type == TransactionType.Withdraw) {
        lastCredit -= +(trx.amount || 0);
      } else {
        lastCredit += +(trx.amount || 0);
      }
      console.log(trx.id,lastCredit)
      trx.credit = lastCredit;
      trx.updatedBy = current;
      trx.createdAt = new Date();
    }
    await manager.save(transactions);
  }

  async getReportBaseUsersCosts(params: any) {
    let where = {};
    if (params?.start) {
      let startMoment = moment(params?.start, AppConstant.SUBMIT_TIME_FORMAT);
      if (startMoment.isValid()) {
        where['submitAt'] = MoreThanOrEqual(startMoment.toDate());
      }
    }

    if (params?.end) {
      let endMoment = moment(params.end, AppConstant.SUBMIT_TIME_FORMAT);
      if (endMoment.isValid()) {
        where['submitAt'] = LessThanOrEqual(endMoment.toDate());
      }
    }

    if (params?.end && params?.start) {
      let startMoment = moment(params.start, AppConstant.SUBMIT_TIME_FORMAT);
      let endMoment = moment(params.end, AppConstant.SUBMIT_TIME_FORMAT);
      if (endMoment.isValid() && startMoment.isValid()) {
        where['submitAt'] = Between(startMoment.toDate(), endMoment.toDate());
      }
    }

    if (params?.user) {
      where['user'] = { id: params?.user };
    }

    const query = Transaction.createQueryBuilder('q')
      .select([])
      .leftJoin('q.user', 'user')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('user.mobile', 'mobile')
      .addSelect('user.id', 'id')
      .addSelect('user.code', 'code')
      .addSelect('SUM(q.amount)', 'totalAmount')
      .addSelect(
        'SUM(CASE WHEN q.sourceType =1 THEN q.amount ELSE 0 END)',
        'bankAmount'
      )
      .addSelect(
        'SUM(CASE WHEN q.sourceType =2 THEN q.amount ELSE 0 END)',
        'cashAmount'
      )
      .where('(q.sourceType =:bankSource OR q.sourceType =:cashSource)', {
        cashSource: TransactionSourceType.CashDesk,
        bankSource: TransactionSourceType.Bank
      })
      .andWhere(where)
      .addGroupBy('user.id')
      .orderBy('SUM(q.amount)', 'DESC');

    return (await query.getRawMany()).map((obj) =>
      plainToInstance(TransactionReportTotalBaseUser, obj)
    );
  }

  async ReportBaseUsersCostsExport(params: any) {
    const data = await this.getReportBaseUsersCosts(params);
    let columns = params?.select?.split(',') || [];
    const option = getExportOptions(TransactionReportTotalBaseUser);
    columns.push(...option.defaultSelect);

    columns = [...new Set(columns)];

    const file = await this.excelService.export(
      option,
      columns,
      data?.length,
      null,
      data
    );
    return file;
    // response.download(file.name);
  }
}
