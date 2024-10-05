import { BadRequestException, Injectable } from '@nestjs/common';
import { errors_zarinpal } from '../dto/error-messages.dto';
import {
  Payment,
  PaymentStatus,
  PaymentType
} from '../entities/payment.entity';
import { firstValueFrom } from 'rxjs';
import { PaymentService } from '../payment.service';
import { HttpService } from '@nestjs/axios';
import { intialZarinPalDto } from '../dto/create-payment-link.dto';
import { VerifyDto, VerifyResponseDto } from '../dto/response-payment.dto';
import { Verify } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { SaleOrderDto } from '../../automation/operational/dto/sale-order.dto';
import { User } from '../../base/entities/User';

@Injectable()
export class ZarinPalService {
  constructor(
    private paymentService: PaymentService,
    private http: HttpService,
    private configService: ConfigService
  ) {}

  async verifyZarinPal(
    authority: string,
    order: SaleOrderDto[],
    current: User,
    isOnlineshop: boolean
  ): Promise<VerifyDto> {
    let errors=[] // dont save to payment 
    const payment = await Payment.findOne({
      where: { authority: authority },
      relations: ['gateway','gateway.bank']
    });
    let orders = [];

    if (!payment) {
      throw new BadRequestException('invalid payment');
    }
    const result = await this.zarinPalWithOutOrder(payment);
    if (result.status !== 200) {
      return { verifyResponse: result, orders };
    }

    if (order && order.length !== 0 && isOnlineshop) {
      orders = await this.paymentService.submitOrderOnlineShop(
        payment,
        order,
        current,
        errors
      );
    } else if (order && order.length !== 0 && !isOnlineshop) {
      orders = await this.paymentService.submitOrder(payment, order, current,errors);
    }

    return { verifyResponse: result, orders };
  }

  async zarinPalWithOutOrder(payment: Payment) {
    let res: VerifyResponseDto = {
      code: undefined,
      message: undefined,
      card_hash: undefined,
      card_pan: undefined,
      ref_id: undefined,
      fee_type: undefined,
      fee: undefined,
      card_number: undefined,
      status: undefined
    };
    let response;

    try {
      response = await firstValueFrom(
        this.http.post(`${this.configService.get('ZARINPAL_VERIFY_URL')}`, {
          merchant_id: payment.gateway.token,
          amount: payment.amount,
          authority: payment.authority
        })
      );
    } catch (error) {
      res.code = error.response.data.errors.code;
      res.message = errors_zarinpal[res.code];
      res.status = 400;
      return res;
    }

    if (
      response &&
      response?.data &&
      response.data.data?.code &&
      response.data.data?.code === 100
    ) {
      res = { ...response.data.data };
      payment.status = PaymentStatus.Ok;
      payment.cardPan = response.data.data.card_pan;
      payment.cardHash = response.data.data.card_hash;
      payment.refId = response.data.data.ref_id;
      payment.fee = payment.fee + response.data.data.fee;
      await payment.save();
    } else if (
      response &&
      response?.data &&
      response.data.data?.code &&
      response.data.data?.code === 101
    ) {
      res = { ...response.data.data };
      payment.status = PaymentStatus.Pending;
      payment.cardPan = response.data.data.card_pan;
      payment.cardHash = response.data.data.card_hash;
      payment.refId = response.data.data.ref_id;
      payment.fee = payment.fee + response.data.data.fee;
      await payment.save();
    }
    res.status = 200;
    res.message = errors_zarinpal[res.code];
    return res;
  }

  async createLinkZarinPal(data: intialZarinPalDto, current: any, user: User) {
    const gateway = data.gateway;
    let response;
   
    try {
      response = await firstValueFrom(
        this.http.post(`${this.configService.get('ZARINPAL_INTIAL_URL')}`, {
          merchant_id: gateway.token,
          amount: data.amount || 0,
          callback_url: data.callback_url,
          description: data.description,
          metadata: { mobile: data.mobile }
        })
      );
    } catch (error) {
      throw new BadRequestException({
        message: errors_zarinpal[error?.response?.data?.errors?.code],
        code: error?.response?.data?.errors?.code
      });
    }

    if (response.data?.errors?.message) {
      throw new BadRequestException({
        message: errors_zarinpal[response?.data?.errors?.code],
        code: response?.data?.errors?.code
      });
    }

    let payment;


    if (
      response.data.data.code &&
      response.data.data.code == 100 &&
      response.data.data.message === 'Success'
    ) {
      payment = new Payment();
      payment.authority = response.data.data.authority;
      payment.type = PaymentType.Online;
      payment.gateway = gateway;
      payment.startPayment = new Date();
      payment.bankAccount = gateway.bank;
      payment.amount = data.amount;
      payment.customer = user;
      // payment.callback = '';
      payment.createdBy = current;
      await payment.save();
    } else {
      throw new BadRequestException('error');
    }
    return `${this.configService.get('ZARINPAL_START_URL')}${
      payment.authority
    }`;
  }
}
