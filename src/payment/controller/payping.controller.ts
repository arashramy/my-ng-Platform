import {
  BadGatewayException,
  Body,
  Controller,
  Post,
  Query,
  Res,
  SetMetadata
} from '@nestjs/common';
import { VerifyDto } from '../dto/verify-payment.dto';
import { User } from '../../base/entities/User';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PayPingService } from '../services/payping.service';
import { Response } from 'express';

@Controller('/api/payping')
export class PayPingController {
  constructor(private payPingService: PayPingService) {}

  @Post('/link')
  @SetMetadata('disable-auth-guard', true)
  async getResult(
    @Query('type') type: string,
    @Query('redirect') redirect: string,
    @Body() model: VerifyDto,
    @Res() response: Response,
    @CurrentUser() current: User
  ) {
    return this.payPingService.verifyPayPingLink(
      type,
      redirect,
      model,
      current,
      response
    );
  }
}
