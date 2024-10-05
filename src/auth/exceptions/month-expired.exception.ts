import { HttpException } from '@nestjs/common';

export class MonthExpiredException extends HttpException {
  constructor() {
    super('Plan expired', 498);
  }
}
