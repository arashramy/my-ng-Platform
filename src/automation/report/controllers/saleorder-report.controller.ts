import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Res,
  UseGuards
} from '@nestjs/common';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { SaleOrder } from '../../operational/entities/SaleOrder';

import { AccessTokenGuard } from '../../../auth/guard/access-token.guard';
import { CurrentOrgUnit } from '../../../common/decorators/current-org-unit.decorator';
import { CurrentFiscalYear } from '../../../common/decorators/current-fiscal-year.decorator';
import { User } from '../../../base/entities/User';
import { SaleOrderReportService } from '../service/saleorder-report.service';
import { ExcelService } from '../../../common/export/ExcelService';
import { getExportOptions } from '../../../common/decorators/export.decorator';
import { Response } from 'express';
import { UserLoan } from 'src/automation/operational/entities/UserLoan';
import { Export } from '../../../common/decorators/export.decorator';
import { SaleItem } from '../../operational/entities/SaleItem';
import { Loan } from '../../base/entities/Loan';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { OrganizationUnit } from '../../../base/entities/OrganizationUnit';

@Export<ManagementReport>({
  name: 'ManagementReport',
  translateKey: 'AUTOMATION_REPORT_MANAGEMENT_ORDER',
  columns: {
    user: {
      transform(obj) {
        if (obj.user) {
          return `${obj?.user?.firstName} ${obj?.user?.lastName} - ${obj?.user?.code}`;
        }
        return obj.user;
      }
    },
    createdBy: {
      transform(obj: any) {
        if (obj.createdBy) {
          return `${obj?.createdBy?.firstName} ${obj?.createdBy?.lastName} - ${obj?.createdBy?.code}`;
        }
        return obj.createdBy;
      }
    },
    updatedBy: {
      transform(obj: any) {
        if (obj.updatedBy) {
          return `${obj?.updatedBy?.firstName} ${obj?.updatedBy?.lastName} - ${obj?.updatedBy?.code}`;
        }
        return obj.updatedBy;
      }
    },

    remainInstallments: {
      transform: (value: any) => {
        return (
          value.items?.filter((e) => {
            const paid = e.transactions
              ?.map((e) => e.amount)
              ?.reduce((acc: any, item: any) => acc + +item, 0);
            return paid - e.amount! !== 0;
          })?.length || '0'
        );
      }
    },
    payedTotalAmount: {
      transform: (value: any) => {
        return (
          value?.userLoan?.items
            ?.map((e) =>
              e.transactions
                ?.map((e) => e.amount)
                ?.reduce((acc: any, item: any) => acc + +item, 0)
            )
            ?.reduce((acc, item) => acc + +item, 0) || '0'
        );
      }
    },
    installments: {
      transform: (value: any) => {
        return value?.userLoan?.installments
          ? `${value?.userLoan?.installments} / ${
              value?.userLoan?.items?.filter((e) => {
                const paid = e.transactions
                  ?.map((e) => e.amount)
                  ?.reduce((acc: any, item: any) => acc + +item, 0);
                return paid - e.amount! === 0;
              })?.length || '0'
            } `
          : '0';
      }
    },
    finalAmount: {
      transform(obj: any) {
        return obj?.totalAmount;
      }
    },
    totalAmount: {
      transform: (value: any) =>
        value?.userLoan
          ? value?.userLoan?.amount! -
            value?.userLoan?.items
              ?.map((e) =>
                e.transactions
                  ?.map((e) => e.amount)
                  ?.reduce((acc: any, item: any) => acc + +item, 0)
              )
              ?.reduce((acc, item) => acc + +item, 0)
          : '0'
    },
    loan: {
      transform: (obj: any) => obj?.userLoan?.loan?.title
    },
    fiscalYear: {
      transform(obj: any) {
        return obj?.fiscalYear?.year;
      }
    },
    items: {
      transform(obj: any) {
        return obj?.items.map((e) => e?.title).join(',');
      }
    },
    reception: {
      transform: (value: any) => {
        return value.reception ? 'Reception' : 'ShopOrder';
      }
    },
    tax: {
      transform: (value: any) => {
        return value.tax || '0';
      }
    },
    transactions: {
      transform: (obj: any) => {
        return obj?.transactions
          ?.map(
            (t) =>
              `${t?.amount} (${
                t.title === 'UserCredit' ? 'کیف پول' : t.title
              }) `
          )
          .join(', ');
      }
    },
    saleUnit: {
      transform: (obj) => obj?.saleUnit?.title
    },
    dept: {
      transform(value: any) {
        return (
          ((value?.settleAmount ?? 0) - (value?.totalAmount ?? 0)) * -1 || '0'
        );
      }
    },
    discount: {
      transform(obj: any) {
        return obj?.discount || '0';
      }
    },
    totalAmountWithoutDiscount: {
      transform(item) {
        return (item.totalAmount || 0) + (item.discount || 0) || '0';
      }
    },
    isPayed: {
      transform(obj: any) {
        return obj?.userLoan?.isPayed === typeof undefined
          ? 'dosenothaveloan'
          : obj?.userLoan?.isPayed
          ? 'paid'
          : 'unpaid';
      }
    },
    organizationUnit: {
      transform(obj) {
        return obj?.organizationUnit?.title;
      }
    },
    amount: {
      transform(obj: any) {
        return obj?.userLoan?.amount || '0';
      }
    }
  }
})
export class ManagementReport {
  submitAt: Date;
  user: User;
  items: SaleItem[];
  finalAmount: any;
  amount: any;
  payedTotalAmount: any;
  totalAmount: any;
  installments: any;
  loan: Loan;
  isPayed: boolean;
  transactions: any;
  reception: any;
  dept: any;
  discount: any;
  totalAmountWithoutDiscount: any;
  tax: any;
  saleUnit: SaleUnit;
  organizationUnit: OrganizationUnit;
  description: string;
  updatedAt: Date;
  updatedBy: any;
  createdAt: Date;
  createdBy: any;
}

@UseGuards(AccessTokenGuard)
@Controller('/api/report/saleOrder')
export class SaleOrderReportController {
  constructor(
    private service: SaleOrderReportService,
    private excelService: ExcelService
  ) {}
  @Get('/bySaleUnit')
  async saleUnitByOrder(@CurrentUser() current: any) {
    const orders = await SaleOrder.find({
      where: { user: { id: current.id } },
      relations: ['user', 'items', 'saleUnit'],
      order: { submitAt: -1 }
    });

    const Array: [
      { saleUnitId: number; saleUnitTitle: string; items: any[]; image: any }
    ] = [] as any;

    orders.map((e) => {
      const index = Array.findIndex((el) => e.saleUnitId === el.saleUnitId);
      if (index === -1) {
        Array.push({
          saleUnitId: e.saleUnitId,
          saleUnitTitle: e?.saleUnit?.title,
          image: e?.saleUnit?.image,
          items: [e]
        });
      } else {
        Array[index].items.push(e);
      }
    });

    return Array;
  }

  @Get('/management')
  async saleOrderReportManagement(
    @Query() params: any,
    @CurrentOrgUnit({ headerOnly: true }) orgUnit,
    @CurrentFiscalYear({ headerOnly: true }) fiscalYear,
    @CurrentUser() current: User
  ) {
    if (!params.limit) {
      params.limit = 10;
    }
    if (!params.organizationUnit) {
      params.organizationUnit = orgUnit;
    }
    params.fiscalYear = fiscalYear;
    params.reception = 'false';
    const result = await this.service.orderLoanReport(params, current);
    return { total: result[1], content: result[0] };
  }

  @Get('management/export')
  @Header('Content-Type', 'text/xlsx')
  async getExportSaleOrderReportManagment(
    @Query() query: any,
    @CurrentOrgUnit({ headerOnly: true }) orgUnit,
    @CurrentFiscalYear({ headerOnly: true }) fiscalYear,
    @CurrentUser() current: User,
    @Res() response: Response
  ) {
    query.limit = 10000000000;
    const { content, total } = await this.saleOrderReportManagement(
      query,
      orgUnit,
      fiscalYear,
      current
    );
    const options = getExportOptions(ManagementReport);
    const file = await this.excelService.export(
      options,
      query.select.split(',') || [],
      total,
      null,
      content.map((value: any) => ({
        ...value,
        createdBy: value.createdBy
      }))
    );
    response.download(file.name);
  }
}
