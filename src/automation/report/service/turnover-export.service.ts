import { Injectable } from '@nestjs/common';
import {
  Transaction,
  TransactionType
} from '../../../automation/operational/entities/Transaction';
import { User } from '../../../base/entities/User';
import { getExportOptions } from '../../../common/decorators/export.decorator';
import { Turnover } from '../dto/Turnover';
import { Response } from 'express';
import { ExcelService } from '../../../common/export/ExcelService';
import { TransactionSourceType } from '../../../base/entities/TransactionSource';
import { TurnoverReportService } from './turnover-report.service';
import * as ExcelJS from 'exceljs';
import * as tmp from 'tmp';

export enum ExportType {
  saleItem = 1,
  tag = 2
}

@Injectable()
export class TurnoverExcel {
  constructor(
    private excelService: ExcelService,
    private turnoverReportService: TurnoverReportService
  ) {}

  async transactionExportIncomeData(where: any, params: any) {
    if (params.shiftWork) {
      delete where.shiftWork;
    }
    return await Transaction.createQueryBuilder('q')
      .select([])
      .addSelect('q.sourceType', 'sourceType')
      .addSelect('q.title', 'title')
      .addSelect('count(q.id)', 'count')
      .addSelect('SUM(q.amount)', 'amount')
      .leftJoin('q.saleUnit', 'saleUnit')
      .leftJoin('q.installmentLoan', 'installmentLoan')
      .where(where)
      .andWhere('q.source_type in (1,2,3,7)')
      .addGroupBy('q.sourceType')
      .addGroupBy('q.title')
      .getRawMany();
  }

  async givingLoanExportIncomeData(transactions: any[]) {
    return transactions.reduce(
      (final: any, currentValue) => {
        final.amount +=
          currentValue.type === TransactionType.Deposit &&
          currentValue.sourceType === TransactionSourceType.Loan
            ? currentValue.amount
            : 0;
        final.count +=
          currentValue.type === TransactionType.Deposit &&
          currentValue.sourceType === TransactionSourceType.Loan
            ? currentValue.count
            : 0;

        // }
        return final;
      },
      { amount: 0, count: 0 } as any
    );
  }

  async chequeExportIncomeData(transactions: any[]) {
    return transactions.reduce(
      (final: any, currentValue) => {
        if (currentValue.sourceType === TransactionSourceType.Cheque) {
          final.count += currentValue.count;

          final.amount += currentValue.amount;
        }
        return final;
      },
      { count: 0, amount: 0 } as any
    );
  }

  async transferExportIncomeData(transactions: any[]) {
    return transactions.reduce(
      (final: any, currentValue) => {
        if (currentValue.sourceType === TransactionSourceType.Transfer) {
          final.count += currentValue.count;

          final.amount += currentValue.amount;
        }
        return final;
      },
      { count: 0, amount: 0 } as any
    );
  }

  settleWithWalletExportIncomeData(transactions: any[]) {
    return transactions.reduce(
      (final: any, currentValue) => {
        final.amount +=
          currentValue.source === 0 &&
          currentValue.sourceTitle === 'UserCredit' &&
          currentValue.type === TransactionType.Settle
            ? currentValue.amount
            : 0;
        final.count +=
          currentValue.source === 0 &&
          currentValue.sourceTitle === 'UserCredit' &&
          currentValue.type === TransactionType.Settle
            ? currentValue.count
            : 0;

        return final;
      },
      { amount: 0, count: 0 } as any
    );
  }

  async loanSettlementamountIncomeData(transactions: any[]) {
    return transactions.reduce(
      (final: any, currentValue) => {
        if (
          currentValue.type === TransactionType.Settle &&
          currentValue.installmentLoanId
        ) {
          final.count += currentValue.count;

          final.amount += currentValue.amount;
        }
        return final;
      },
      { count: 0, amount: 0 } as any
    );
  }

  depositeIncomeData(transactions: any[]) {
    return transactions.reduce(
      (final: any, currentValue) => {
        final.amount +=
          currentValue.type === TransactionType.Deposit
            ? currentValue.amount
            : 0;
        final.count +=
          currentValue.type === TransactionType.Deposit
            ? currentValue.count
            : 0;

        return final;
      },
      { amount: 0, count: 0 } as any
    );
  }

  withDrawsIncomeData(transactions: any[]) {
    return transactions.reduce(
      (final: any, currentValue) => {
        final.amount +=
          currentValue.type === TransactionType.Withdraw
            ? currentValue.amount
            : 0;
        final.count +=
          currentValue.type === TransactionType.Withdraw
            ? currentValue.count
            : 0;

        return final;
      },
      { amount: 0, count: 0 } as any
    );
  }

  async excelIncome(
    params: any,
    orgUnit: number,
    fiscalYear: number,
    current: User
  ): Promise<{ models: any[]; columns: any; count: any }> {
    let where = this.turnoverReportService.prepareConditions(
      params,
      orgUnit,
      fiscalYear,
      current
    );
    const trxQuery = await this.transactionExportIncomeData(
      { ...where },
      params
    );
    const trxData = await this.turnoverReportService.transactions(params, {
      ...where
    });
    const discount = await this.turnoverReportService.discount(params, {
      ...where
    });
    const givingLoan = await this.givingLoanExportIncomeData(trxData);
    const cheque = await this.chequeExportIncomeData(trxData);
    const transfer = await this.transferExportIncomeData(trxData);
    const notSettled = await this.turnoverReportService.notSettled(params, {
      ...where
    });
    const settleWithWallet = await this.settleWithWalletExportIncomeData(
      trxData
    );

    const transferSaleItem=await this.turnoverReportService.transferSaleItems(params,where)

    console.log("transferSaleItem", transferSaleItem.reduce(
      (e, item) => {
        e.Amount += +item.discount;
        e.Count += +item.count;
        return { ...e };
      },
      {
        Amount: 0,
        Count: 0,
        Title: this.excelService.translate(
          'AUTOMATION_REPORT_TURNOVER.transferSaleItem'
        )
      }))

    const count = trxQuery.length + discount.length;
    const withdraw = await this.withDrawsIncomeData(trxData);

    let columns = ['Title', 'Count', 'Amount'];
    const models = [
      ...trxQuery.map((e) => {
        return { Title: e.title, Count: e.count, Amount: e.amount };
      }),
      discount.reduce(
        (e, item) => {
          e.Amount += +item.discount;
          e.Count += +item.count;
          return { ...e };
        },
        {
          Amount: 0,
          Count: 0,
          Title: this.excelService.translate(
            'AUTOMATION_REPORT_TURNOVER.notSettled'
          )
        }
      ),
      {
        Title: await this.excelService.translate(
          'AUTOMATION_REPORT_TURNOVER.givingLoan'
        ),
        Count: givingLoan.count,
        Amount: givingLoan.amount
      },
      {
        Title: await this.excelService.translate(
          'AUTOMATION_REPORT_TURNOVER.cheque'
        ),
        Count: cheque.count,
        Amount: cheque.amount
      },
      {
        Title: await this.excelService.translate(
          'AUTOMATION_REPORT_TURNOVER.Withdraw'
        ),
        Count: withdraw.count,
        Amount: withdraw.amount
      },
      {
        Title: await this.excelService.translate(
          'AUTOMATION_REPORT_TURNOVER.transfer'
        ),
        Count: transfer.count,
        Amount: Math.abs(transfer?.amount || 0)
      },
      notSettled.reduce(
        (e, item) => {
          e.Amount += +item.amount;
          e.Count += +item.count;
          return { ...e };
        },
        {
          Amount: 0,
          Count: 0,
          Title: this.excelService.translate(
            'AUTOMATION_REPORT_TURNOVER.notSettled'
          )
        }
      ),
      {
        Title: this.excelService.translate(
          'AUTOMATION_REPORT_TURNOVER.settleWithWallet'
        ),
        Amount: settleWithWallet.amount,
        Count: settleWithWallet.count
      },
      transferSaleItem.reduce(
        (e, item) => {
          e.Amount += +item.totalAmount;
          e.Count += +item.count;
          return { ...e };
        },
        {
          Amount: 0,
          Count: 0,
          Title: this.excelService.translate(
            'AUTOMATION_REPORT_TURNOVER.transferSaleItem'
          )
        }
      ),
    ];

    return { models, columns, count };
  }

  async excelTag(
    params: any,
    orgUnit: number,
    fiscalYear: number,
    current: User
  ): Promise<{ models: any; columns: any; count: any }> {
    let where = this.turnoverReportService.prepareConditions(
      params,
      orgUnit,
      fiscalYear,
      current
    );
    const tags = await this.turnoverReportService.tags(params, { ...where });
    const transactions = await this.turnoverReportService.transactions(params, {
      ...where
    });
    const loanSettlement = await this.loanSettlementamountIncomeData(
      transactions
    );
    const deposit = await this.depositeIncomeData(transactions);
    const withdraw = await this.withDrawsIncomeData(transactions);


    let columns = ['Title', 'Count', 'Quantity', 'Amount'];
    const models = [
      ...tags.map((e) => {
        return {
          Title: e.title,
          Count: +e.count,
          Amount: +e.amount,
          Quantity: +e.quantity
        };
      }),
      {
        Title: this.excelService.translate(
          'AUTOMATION_REPORT_TURNOVER.loanSettlement'
        ),
        Count: loanSettlement.count,
        Amount: loanSettlement.amount,
        Quantity: loanSettlement.quantity
      },
      {
        Title: this.excelService.translate(
          'AUTOMATION_REPORT_TURNOVER.deposit'
        ),
        Count: deposit.count,
        Amount: deposit.amount,
        Quantity: deposit.quantity
      },
      {
        Title: this.excelService.translate(
          'AUTOMATION_REPORT_TURNOVER.Withdraw'
        ),
        Count: withdraw.count,
        Amount: withdraw.amount,
        Quantity: withdraw.quantity
      }
    ];
    return {
      models: models,
      columns: columns,
      count: tags.length
    };
  }

  async excelSale(
    params: any,
    orgUnit: number,
    fiscalYear: number,
    current: User
  ): Promise<{ models: any[]; columns: any; count: any }> {
    let where = this.turnoverReportService.prepareConditions(
      params,
      orgUnit,
      fiscalYear,
      current
    );
    console.log("whereee",where)
    const saleItem = await this.turnoverReportService.saleItems(params, where);
    const transactions = await this.turnoverReportService.transactions(
      params,
      where
    );

    const loanSettlement = await this.loanSettlementamountIncomeData(
      transactions
    );
    const deposit = await this.depositeIncomeData(transactions);
    const withdraw = await this.withDrawsIncomeData(transactions);
    const taxs = await this.turnoverReportService.taxs(params, where);
    console.log('the taxs is', taxs);

    const count = saleItem.length;
    let columns = ['Title', 'Count', 'Quantity', 'Amount'];
    const models = [
      ...saleItem.map((e) => {
        return {
          Title: e.title,
          Count: +e.count,
          Amount: +e.amount,
          Quantity: +e.quantity
        };
      }),
      {
        Title: this.excelService.translate(
          'AUTOMATION_REPORT_TURNOVER.loanSettlement'
        ),
        Count: loanSettlement.count,
        Amount: loanSettlement.amount,
        Quantity: loanSettlement.quantity
      },
      {
        Title: this.excelService.translate(
          'AUTOMATION_REPORT_TURNOVER.deposit'
        ),
        Count: deposit.count,
        Amount: deposit.amount,
        Quantity: deposit.quantity
      },
      {
        Title: this.excelService.translate(
          'AUTOMATION_REPORT_TURNOVER.Withdraw'
        ),
        Count: withdraw.count,
        Amount: withdraw.amount,
        Quantity: withdraw.quantity
      },
      {
        Title: this.excelService.translate('AUTOMATION_REPORT_TURNOVER.Tax'),
        Count: taxs.count || 0,
        Amount: taxs.amount || 0,
        Quantity: taxs.quantity || 0
      }
    ];

    return { models, columns, count };
  }

  async excel(
    params: any,
    type: number,
    orgUnit: number,
    fiscalYear: number,
    current: User,
    res: Response
  ) {
    const options = getExportOptions(Turnover);
    let setting = await this.excelService.loadSetting();
    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties.fullCalcOnLoad = true;
    const sheet: ExcelJS.Worksheet = workbook.addWorksheet(
      this.excelService.translate(options.name || ''),
      { views: [{ rightToLeft: setting.dir == 'rtl' }] }
    );

    sheet.mergeCells('A1:C1');
    sheet.getCell('A1').value = this.excelService.translate(
      'AUTOMATION_REPORT_TURNOVER.Incomes'
    );
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('D1:G1');
    sheet.getCell('D1').value = this.excelService.translate(
      'AUTOMATION_REPORT_TURNOVER.Sales'
    );
    sheet.getCell('D1').alignment = { horizontal: 'center' };

    const { columns: columnsIncomes, models: modelIncomes } =
      await this.excelIncome(params, orgUnit, fiscalYear, current);

    const { columns: columnsSales, models: modelSales } =
      +type === ExportType.saleItem
        ? await this.excelSale(params, orgUnit, fiscalYear, current)
        : await this.excelTag(params, orgUnit, fiscalYear, current);

    let colsIncome = columnsIncomes.map((c) => {
      let col = options.columns[c];
      return {
        name: this.excelService.translate(
          options.translateKey
            ? `${options.translateKey}.${col?.label || c}`
            : col?.label || c
        ),
        totalsRowLabel: col?.totalsRowLabel
          ? this.excelService.translate(
              options.translateKey
                ? `${options.translateKey}.${col?.totalsRowLabel}`
                : col?.totalsRowLabel
            )
          : '',
        filterButton: !!col?.filterButton,
        totalsRowFunction: col?.totalsRowFunction || 'none'
      };
    });

    let colsSales = columnsSales.map((c) => {
      let col = options.columns[c];
      return {
        name: this.excelService.translate(
          options.translateKey
            ? `${options.translateKey}.${col?.label || c}`
            : col?.label || c
        ),
        totalsRowLabel: col?.totalsRowLabel
          ? this.excelService.translate(
              options.translateKey
                ? `${options.translateKey}.${col?.totalsRowLabel}`
                : col?.totalsRowLabel
            )
          : '',
        filterButton: !!col?.filterButton,
        totalsRowFunction: col?.totalsRowFunction || 'none'
      };
    });

    let table2: ExcelJS.Table = sheet.addTable({
      name: this.excelService.translate(options.name || ''),
      ref: 'D2',
      headerRow: options.headerRow || true,
      totalsRow: options.totalsRow || true,
      style: {
        theme: options.theme || 'TableStyleDark1',
        showRowStripes: true
      },
      columns: colsSales,
      rows: []
    });

    let table: ExcelJS.Table = sheet.addTable({
      name: this.excelService.translate(options.name || ''),
      ref: 'A2',
      headerRow: options.headerRow || true,
      totalsRow: options.totalsRow || true,
      style: {
        theme: options.theme || 'TableStyleLight7',
        showRowStripes: true
      },
      columns: colsIncome,
      rows: []
    });

    let takes = 0;
    let index = 0;
    while (takes < modelIncomes.length) {
      let models = [];

      models.push(...modelIncomes);
      takes += models.length;
      for (let model of models) {
        let row = this.excelService.prepareRowValue(
          workbook,
          sheet,
          index,
          model,
          options,
          columnsIncomes,
          setting.calendar
        );
        table.addRow(row[0] as any[]);
        if (row[1]) {
          sheet.getRow(index + 1).height = 40;
        }
        index++;
      }
    }

    let takes2 = 0;
    let index2 = 0;
    while (takes2 < modelSales.length) {
      let models = [];
      models.push(...modelSales);
      takes2 += models.length;
      for (let model of models) {
        let row = this.excelService.prepareRowValue(
          workbook,
          sheet,
          index,
          model,
          options,
          columnsSales,
          setting.calendar
        );
        table2.addRow(row[0] as any[]);
        if (row[1]) {
          sheet.getRow(index + 1).height = 40;
        }
        index2++;
      }
    }

    sheet.getColumn(1).width = 200;

    this.excelService.AdjustColumnWidth(sheet);
    table.commit();
    table2.commit();
    const tmpobj = tmp.fileSync({
      mode: 0o644,
      prefix: 'report-',
      postfix: '.xlsx'
    });
    await workbook.xlsx.writeFile(tmpobj.name);
    return tmpobj;
  }
}
