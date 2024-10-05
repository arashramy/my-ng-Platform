import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ContractorReportsController } from './controllers/contractor-reports.controller';
import { SaleReportsController } from './controllers/sale-reports.controller';
import { TurnoverReportsController } from './controllers/ternover-reports.controller';
import { ReceptionReportService } from './service/reception-report.service';
import { ShopReportService } from './service/shop-report.service';
import { AutomationOperationalModule } from '../operational/automation-operational.module';
import { ContractorReportService } from './service/contractor-report.service';
import { UserTrafficReport } from './controllers/user-traffic-report.controller';
import { RegisteredServiceReportController } from './controllers/registered-reorts.controller';
import { SaleOrderReportController } from './controllers/saleorder-report.controller';
import { ExcelService } from '../../common/export/ExcelService';
import { TurnoverExcel } from './service/turnover-export.service';
import { TurnoverReportService } from './service/turnover-report.service';
import { SaleOrderReportService } from './service/saleorder-report.service';

@Module({
  controllers: [
    ContractorReportsController,
    SaleReportsController,
    TurnoverReportsController,
    UserTrafficReport,
    RegisteredServiceReportController,
    SaleOrderReportController,
    
  ],
  providers: [
    ReceptionReportService,
    ShopReportService,
    ContractorReportService,
    UserTrafficReport,
    ExcelService,
    TurnoverExcel,
    TurnoverReportService,
    SaleOrderReportService
  ],
  exports: [ReceptionReportService, ShopReportService, ContractorReportService],
  imports: [AuthModule, AutomationOperationalModule]
})
export class AutomationReportModule {}
