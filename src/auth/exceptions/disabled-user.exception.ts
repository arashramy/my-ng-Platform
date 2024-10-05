import { HttpException } from '@nestjs/common';

export class DisabledUserException extends HttpException {
  constructor(message: string) {
    super(message || 'کاربر مورد نظر غیرفعال است', 400);
  }
}
