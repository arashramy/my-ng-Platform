import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import {
  Between,
  DataSource,
  Equal,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not
} from 'typeorm';
import moment from 'moment';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { common_permissions } from '../../../common/controller/base.controller';
import {
  PermissionAction,
  PermissionKey
} from '../../../common/constant/auth.constant';
import { AppConstant } from '../../../common/constant/app.constant';
import { Role, User } from '../../../base/entities/User';
import { SaleItem } from '../../operational/entities/SaleItem';
import { CurrentFiscalYear } from '../../../common/decorators/current-fiscal-year.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ContractorReportService } from '../service/contractor-report.service';
import { AccessTokenGuard } from '../../../auth/guard/access-token.guard';
import { GroupClassRoom } from '../../../automation/base/entities/GroupClassRoom';
import { ExcelService } from '../../../common/export/ExcelService';
import { getExportOptions } from '../../../common/decorators/export.decorator';
import { ContractorReport } from '../dto/ContractoReport';
import { Response } from 'express';

export enum contractorType {
  service,
  detail,
  saleItem,
  user,
  contractor
}

@Permissions([
  ...common_permissions,
  Role.Contactor,
  PermissionKey.AUTOMATION_REPORT_CONTRACTOR,
  `${PermissionKey.AUTOMATION_REPORT_CONTRACTOR}_${PermissionAction.READ}`
])
@Controller('/api/reports/contractor')
export class ContractorReportsController {
  constructor(
    private ds: DataSource,
    private contractorReportService: ContractorReportService,
    private excelService: ExcelService
  ) {}

  prepareConditions(
    user: User,
    orgUnit: number,
    fiscalYear: number,
    contractor: number,
    product: number,
    start: string,
    end: string,
    saleUnit: number,
    type: string
  ) {
    let where: any = {};
    if (contractor) {
      where['user'] = contractor;
    } else {
      where['user'] = Not(IsNull());
    }
    if (orgUnit) {
      where['saleItem'] = { organizationUnit: orgUnit };
    }
    //! contarctor can see the all data
    // else if (!user.isAdmin()) {
    //   if (!user.isUser() && user.isContractor() && contractor) {
    //   } else {
    //     console.log("called")
    //     where['saleItem'] = {
    //       organizationUnit: In(
    //         user?.accessOrganizationUnits?.map((s) => s.id) || []
    //       )
    //     };
    //   }
    // }

    if (fiscalYear) {
      where['saleItem'] = {
        ...where['saleItem'],
        fiscalYear
      };
    }
    //! contarctor can see the all data
    // else if (!user.isAdmin()) {
    //   where['saleItem'] = {
    //     ...where['saleItem'],
    //     fiscalYear: In(user?.accessFiscalYears?.map((s) => s.id) || [])
    //   };
    // }

    if (product && product !== 0) {
      where['saleItem'] = { product };
    }
    if (start) {
      let startMoment = moment(start, AppConstant.DATE_FORMAT);
      if (startMoment.isValid()) {
        where['saleItem'] = {
          ...where['saleItem'],
          submitAt: MoreThanOrEqual(startMoment.format(AppConstant.DATE_FORMAT))
        };
      }
    }
    if (end) {
      let endMoment = moment(end, AppConstant.DATE_FORMAT);
      if (endMoment.isValid()) {
        where['saleItem'] = {
          ...where['saleItem'],
          submitAt: LessThanOrEqual(endMoment.format(AppConstant.DATE_FORMAT))
        };
      }
    }

    if (start && end) {
      let startMoment = moment(start, AppConstant.DATE_FORMAT);
      let endMoment = moment(end, AppConstant.DATE_FORMAT);
      if (startMoment.isValid() && endMoment.isValid()) {
        where['saleItem'] = {
          ...where['saleItem'],
          submitAt: Between(
            startMoment.format(AppConstant.DATE_FORMAT),
            endMoment.format(AppConstant.DATE_FORMAT)
          )
        };
      }
    }

    if (saleUnit && saleUnit !== 0) {
      where['saleItem'] = {
        ...where['saleItem'],
        saleUnit
      };
    }

    return where;
  }

  @UseGuards(AccessTokenGuard)
  @Get('/group-class-room')
  async getGroupClassRoom(@CurrentUser() user: User) {
    const data = await GroupClassRoom.find({
      where: { contractors: { id: user.id } },
      relations: { schedules: true }
    });
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < data[i]?.configs.length; j++) {
        const filled = (
          await SaleItem.find({
            where: {
              contractor: { id: data?.[i]?.configs?.[j]?.contractorId },
              groupClassRoom: { id: data?.[i]?.id }
            },
            relations: {
              groupClassRoom: true,
              contractor: true
            }
          })
        ).filter((e) => e.credit - e.usedCredit > 0);
        data[i].configs[j] = {
          ...data[i].configs[j],
          filled: filled.length
        } as any;
      }
    }
    return data;
  }

  @Get('/:mode')
  async getContractorReport(
    @CurrentFiscalYear({ headerOnly: true }) fiscalYear: number,
    @CurrentUser() user: User,
    @Param('mode') mode: number,
    @Query() query: any
  ) {
    if (
      !user.roles.includes(Role.Admin) &&
      user.roles.includes(Role.Contactor)
    ) {
      query.contractor = user.id;
    }

    let filters = {
      product: query['product.equals'],
      user: query['user.equals'],
      'detailType.equals': query['detailType.equals']
    };
    const where = this.prepareConditions(
      user,
      query.orgUnit,
      fiscalYear,
      query.contractor,
      query.product,
      query.start,
      query.end,
      query.saleUnit,
      query.type
    );
    //find by service
    if (mode === contractorType.service) {
      return this.contractorReportService.findByService(
        query.type,
        query.offset,
        query.limit,
        where,
        filters
      );
    }

    if (mode === contractorType.detail) {
      return this.contractorReportService.details(
        query.type,
        query.offset,
        query.limit,
        where,
        filters
      );
    }

    if (mode === contractorType.user)
      return this.contractorReportService.findByUser(
        query.type,
        query.offset,
        query.limit,
        where,
        filters
      );

    if (mode === contractorType.saleItem) {
      return this.contractorReportService.findSaleItem(
        query.type,
        query.offset,
        query.limit,
        where,
        filters,
        user  
      );
    }
    if (mode === contractorType.contractor) {
      return await this.contractorReportService.findContractor(
        query.type,
        query.offset,
        query.limit,
        where
      );
    }
  }

  @Get('export/:mode')
  async getContractorReportExport(
    @CurrentFiscalYear({ headerOnly: true }) fiscalYear: number,
    @CurrentUser() user: User,
    @Param('mode') mode: number,
    @Query() query: any,
    @Res() response: Response
  ) {
    let filters = {
      product: query['product.equals'],
      user: query['user.equals'],
      'detailType.equals': query['detailType.equals']
    };

    query.limit = 10000;
    if (
      !user.roles.includes(Role.Admin) &&
      user.roles.includes(Role.Contactor)
    ) {
      query.contractor = user.id;
    }
    let data: any[];
    let columns: any[];
    const where = this.prepareConditions(
      user,
      query.orgUnit,
      fiscalYear,
      query.contractor,
      query.product,
      query.start,
      query.end,
      query.saleUnit,
      query.type
    );
    //find by service
    columns = query.select?.split(',') || [];
    if (mode === contractorType.service) {
      data = (
        await this.contractorReportService.findByService(
          query.type,
          query.offset,
          query.limit,
          where,
          filters
        )
      ).content;
      data = data.map((e) => ({
        ...e,
        Income: e.totalAmount - e.contractorIncome,
        IncomeAfterDiscount: e.totalAmount - e.contractorIncomeAfterDiscount
      }));
    } else if (mode === contractorType.detail) {
      data = (
        await this.contractorReportService.details(
          query.type,
          query.offset,
          query.limit,
          where,
          filters
        )
      ).content;
      data = data.map((e) => {
        return {
          ...e,
          contractorIncome: e.amount || 0,
          contractorIncomeAfterDiscount: e.amountAfterDiscount || 0,
          Income: e.saleItem.totalAmount - e.amount || 0,
          IncomeAfterDiscount:
            e.saleItem.totalAmount - e.amountAfterDiscount || 0,
          mainServicePriceAmount: e?.saleItem?.totalAmount || 0,
          discount: e?.saleItem.discount || 0
        };
      });
    } else if (mode === contractorType.user) {
      data = (
        await this.contractorReportService.findByUser(
          query.type,
          query.offset,
          query.limit,
          where,
          filters
        )
      ).content;
      data = data.map((e) => ({
        ...e,
        Income: e.totalAmount - e.contractorIncome,
        IncomeAfterDiscount: e.totalAmount - e.contractorIncomeAfterDiscount
      }));
    } else if (mode === contractorType.saleItem) {
      data = (
        await this.contractorReportService.findSaleItem(
          query.type,
          query.offset,
          query.limit,
          where,
          filters,
          user
        )
      ).content;
    } else if (mode === contractorType.contractor) {
      data = (
        await this.contractorReportService.findContractor(
          query.type,
          query.offset,
          query.limit,
          where
        )
      ).content;
      data = data.map((e) => ({
        ...e,
        Income: e.totalAmount - e.contractorIncome,
        IncomeAfterDiscount: e.totalAmount - e.contractorIncomeAfterDiscount
      }));
    }

    const option = getExportOptions(ContractorReport);
    columns.push(...option.defaultSelect);

    columns = [...new Set(columns)];

    const file = await this.excelService.export(
      option,
      columns,
      data?.length,
      null,
      data
    );

    response.download(file.name);
  }
}
