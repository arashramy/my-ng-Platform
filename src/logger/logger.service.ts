import { Inject, Injectable } from '@nestjs/common';
import { Logger } from './logger.abstract';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class AppLoggerService {
  @Inject(ModuleRef)
  private readonly moduleRef: ModuleRef;

  private logger: Logger;

  setLogger(name: string) {
    this.logger = this.moduleRef.get(name);
    return { log: this.log, error: this.error, warn: this.warn };
  }

  private log = (...message: any) => {
    this.logger.log(message.map((e) => JSON.stringify(e, null, 56)).join(' '));
  };

  private error = (...message: any) => {
    this.logger.error(
      message.map((e) => JSON.stringify(e, null, 56)).join(' ')
    );
  };

  private warn = (...message: any) => {
    this.logger.warn(message.map((e) => JSON.stringify(e, null, 56)).join(' '));
  };
}
