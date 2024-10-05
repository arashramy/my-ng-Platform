import { Injectable } from '@nestjs/common';
import { Logger } from '../logger.abstract';

const chalk = require('chalk');

@Injectable()
export class ChalkLoggerService implements Logger {
  log(message: any) {
    console.log(chalk.blue(message));
  }
  error(message: any) {
    console.log(chalk.red(message));
  }
  warn(message: any) {
    console.log(chalk.yellow(message));
  }
}
