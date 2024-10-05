import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Put,
  Query,
  Res,
  SetMetadata
} from '@nestjs/common';
import {
  intialPayPingDto,
  intialPaymentDto,
  intialZarinPalDto
} from './dto/create-payment-link.dto';
import { VerifyDto } from './dto/verify-payment.dto';
import { StripeService } from './services/stripe.service';
import { ZarinPalService } from './services/zarinpal.service';
import { PayPingService } from './services/payping.service';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ReadController } from '../common/controller/base.controller';
import { Payment } from './entities/payment.entity';
import { PermissionKey } from '../common/constant/auth.constant';
import { Role, User } from '../base/entities/User';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Gateway, GatewayType } from '../base/entities/Gateway';
import { SaleUnit } from '../base/entities/SaleUnit';
import { Setting } from '../base/entities/Setting';
import { SettingKey } from '../base/entities/Setting';

@Controller('/api/payment')
export class PaymentController extends ReadController<Payment> {
  constructor(
    private payPingService: PayPingService,
    private stripeService: StripeService,
    private zarinPalService: ZarinPalService,
    private configService: ConfigService
  ) {
    super(Payment, PermissionKey.BASE_PAYMENT);
  }

  @Post('intial/:id')
  async createLinkGateWay(
    @Param('id') id: string,
    @Body() body: intialPaymentDto,
    @CurrentUser() current: User
  ) {
    const gateway = await Gateway.findOne({ where: { id: +id } });
    if (!gateway) {
      throw new BadRequestException('invalid id');
    }
    let user: User | undefined = undefined;

    if (body?.customer) {
      user = await User.findOne({ where: { id: +body.customer } });
      if (!user) {
        throw new BadRequestException('invalid coustomer');
      }
    } else {
      throw new BadRequestException('customer is required');
    }

    console.log('the user is', user);

    if (!body.amount && gateway.type !== GatewayType.Stripe) {
      throw new BadRequestException('amount is required');
    }

    if (body?.saleUnit) {
      const saleUnit = await SaleUnit.findOne({ where: { id: body.saleUnit } });
      if (!saleUnit || !saleUnit.allowSettle) {
        throw new BadRequestException('saleUnit have to access to settle');
      }
    }

    if (!body.callbackUrl) {
      throw new BadRequestException('callback url is required');
    } else {
      // body.callbackUrl = `${body.callbackUrl}?type=${gateway.type}`;
    }

    if (
      (!body.products || body.products.length === 0) &&
      gateway.type === GatewayType.Stripe
    ) {
      throw new BadRequestException('product info is required');
    }

    if (!body.description && gateway.type === GatewayType.ZarinPal) {
      throw new BadRequestException('description is required');
    }

    let url: any;

    switch (gateway.type) {
      case GatewayType.ZarinPal:
        const zarinPalBody: intialZarinPalDto = {
          amount: body?.amount,
          mobile: user?.mobile,
          description: body.description,
          gateway: gateway,
          callback_url: `${body.callbackUrl}?type=${gateway.type}`
        };
        url = await this.zarinPalService.createLinkZarinPal(
          zarinPalBody,
          current,
          user
        );
        break;
      case GatewayType.PayPing:
        const value = await Setting.findByKey(SettingKey.OnlineSetting);
        if (!value || !value?.paypingBackUrl)
          throw new BadRequestException('invaid ip static.please call supporter');
        const returnUrl = `${value.paypingBackUrl}/api/payping/link?type=${encodeURIComponent(
          gateway.type
        )}&redirect=${encodeURIComponent(body.callbackUrl)}`;
        const payPingBody: intialPayPingDto = {
          amount: body.amount,
          payerName: user ? `${user.firstName} ${user.lastName}` : undefined,
          payerIdentity: user?.mobile,
          description: body.description,
          returnUrl,
          gateway: gateway,
          orders: body.orders,
          agent: body.agent
        };
        url = await this.payPingService.createPayPingLink(
          payPingBody,
          current,
          user
        );
        break;
      case GatewayType.Stripe:
        url = await this.stripeService.createStripeLink(
          body.products,
          user,
          gateway,
          `${body.callbackUrl}?type=${gateway.type}`,
          current
        );
        break;
    }
    return { url, success: url ? true : false };
  }

  @Put('/verify')
  async verifyPayment(@Body() model: VerifyDto, @CurrentUser() current: User) {
    let result;
    if (model?.refId && model?.code) {
      result = await this.payPingService.verifyPayPing(
        model.refId,
        model?.code,
        null,
        current,
        false
      );
    } else if (model?.authority) {
      result = await this.zarinPalService.verifyZarinPal(
        model.authority,
        null,
        current,
        false
      );
    } else if (model?.stripId) {
      result = await this.stripeService.verifyStripeCheckout(
        model?.stripId,
        null,
        current,
        false
      );
    }
    return result;
  }

  @Put('/verify/submitOrder')
  async submitOrderByVerify(
    @Body() model: VerifyDto,
    @CurrentUser() current: User
  ) {
    let response;
    console.log('model is', model);
    if (model?.refId && model?.code) {
      response = await this.payPingService.verifyPayPing(
        model?.refId,
        model?.code,
        model?.orders,
        current,
        true // baadan dyd dorost she va bar asas saleunit bashe
      );
    }
    if (model?.authority) {
      response = await this.zarinPalService.verifyZarinPal(
        model.authority,
        model.orders,
        current,
        model.isonlineShop
      );
    }
    if (model?.stripId) {
      response = await this.stripeService.verifyStripeCheckout(
        model?.stripId,
        model.orders,
        current,
        model?.isonlineShop
      );
    }
    return response;
  }

  additionalPostPermissions(): string[] {
    return [Role.User, Role.Membership];
  }

  additionalPermissions(): string[] {
    return [];
  }
}
