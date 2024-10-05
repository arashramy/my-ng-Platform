import { Module } from '@nestjs/common';
import { AutomationOperationalModule } from './operational/automation-operational.module';
import { AutomationReportModule } from './report/automation-report.module';
import { AutomationBaseModule } from './base/automation-base.module';
import { AutomationTransferModule } from './transfer/automation-transfer.module';
import {EventEmitterModule} from "@nestjs/event-emitter";

@Module({
  imports: [
    AutomationOperationalModule,
    AutomationReportModule,
    AutomationBaseModule,
    AutomationTransferModule,
    EventEmitterModule.forRoot()
  ],
  providers: [],
})
export class AutomationModule {}
