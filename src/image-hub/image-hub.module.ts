import { Module } from '@nestjs/common';
import { GhadirImageHubAdapterService } from './adapeters/ghadir-image-hub.service';
import { ImageHubAdapterService } from './image-hub-adapter.service';
import { PalizImageHubAdapterService } from './adapeters/paliz-image-hub.service';
import { DeviceModule } from '../remote/device/device.module';
import { HttpModule } from '@nestjs/axios';
import { ImageHubProcessingEvent } from './listeners/image-hub.listener';
import { ImageHubController } from './image-hub.controller';
import { CheckPlan } from '../auth/guard/check.plan';
import { ResolveHelper } from '../common/helper/resolver-data.helper';
import { ExcelService } from '../common/export/ExcelService';
import { ImportService } from '../common/import/ImportService';
import { AuthModule } from '../auth/auth.module';
import { AccessTokenGuard } from '../auth/guard/access-token.guard';
import { ImageHubHelper } from './image-hub.helper';

export enum ImageHubType {
  PALIZ = 'PALIZ',
  GHADIR = 'GHADIR'
}

@Module({
  imports: [DeviceModule, HttpModule, AuthModule],
  controllers: [ImageHubController],
  providers: [
    ImageHubProcessingEvent,
    ImageHubAdapterService,
    GhadirImageHubAdapterService,
    CheckPlan,
    ResolveHelper,
    ExcelService,
    ImportService,
    AccessTokenGuard,
    ImageHubHelper,
    {
      provide: `IMAGE_HUB_PALIZ`,
      useClass: PalizImageHubAdapterService
    },
    {
      provide: `IMAGE_HUB_GHADIR`,
      useClass: GhadirImageHubAdapterService
    }
  ]
})
export class ImageHubModule {}
