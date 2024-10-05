import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SMSModule } from '../sms/sms.module';
import { CheckPlan } from '../auth/guard/check.plan';
import { TokenStoreService } from '../auth/service/token-store.service';
import { ExcelService } from '../common/export/ExcelService';
import { ResolveHelper } from '../common/helper/resolver-data.helper';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';

@Module({ 
    imports: [HttpModule, SMSModule], 
    providers: [BackupService, CheckPlan, ResolveHelper, ExcelService,TokenStoreService], 
    exports: [BackupService], 
    controllers: [BackupController]
})
export class BackupModule { }
