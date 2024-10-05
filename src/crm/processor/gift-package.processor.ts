import { Process, Processor } from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import { Job } from 'bull';
import { EditUserGiftPackageProcessorDTO } from '../dto/edit-user-gift-package.dto';
import { GiftPackageProcessService } from '../service/gift-package.service';
import { AppLoggerService } from '../../logger/logger.service';
import { CHALK_SERVICE_LOGGER_PROVIDER } from '../../logger/chalk-logger/chalk-provider';

@Processor('gift-package')
export class GiftPackageProcessor {
  @Inject(GiftPackageProcessService)
  private readonly giftPackageProcessService: GiftPackageProcessService;

  @Inject(AppLoggerService)
  private readonly appLoggerService: AppLoggerService;

  @Process('add-user')
  async editUserGiftPackage(payload: Job<EditUserGiftPackageProcessorDTO>) {
    try {
      this.appLoggerService
        .setLogger(CHALK_SERVICE_LOGGER_PROVIDER)
        .log('ADD USER PROCESS');
      this.giftPackageProcessService.onEditUserGiftPackage(payload.data);
    } catch (error) {
      console.log('error happened : add-user process', error);
    }
  }

  @Process('use-gift')
  async useGiftPackageByUser({ data }: Job<{ user: number }>) {
    console.log(9595499559955, data);
    try {
      this.appLoggerService
        .setLogger(CHALK_SERVICE_LOGGER_PROVIDER)
        .log('USE GIFT PROCESS');
      this.giftPackageProcessService.onUpdateUsedGiftPackageBasedOnSaleItem(
        data.user
      );
    } catch (error) {
      console.log('usedGiftPackage ERROR');
    }
  }
}
