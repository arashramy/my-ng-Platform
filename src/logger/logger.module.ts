import { Module } from '@nestjs/common';
import { AppLoggerService } from './logger.service';
import { CHALK_PROVIDER } from './chalk-logger/chalk-provider';

@Module({
  providers: [AppLoggerService, CHALK_PROVIDER],
  exports: [AppLoggerService]
})
export class AppLoggerModule {}
