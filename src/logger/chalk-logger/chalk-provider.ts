import { Provider } from '@nestjs/common';
import { ChalkLoggerService } from './chalk-logger.service';

export const CHALK_SERVICE_LOGGER_PROVIDER = 'CHALK_SERVICE_LOGGER_PROVIDER';

export const CHALK_PROVIDER: Provider = {
  provide: CHALK_SERVICE_LOGGER_PROVIDER,
  useClass: ChalkLoggerService
};
