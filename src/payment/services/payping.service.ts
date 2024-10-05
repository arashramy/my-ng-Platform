import { intialPayPingDto } from '../dto/create-payment-link.dto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { PaymentService } from '../payment.service';
import {
  BadGatewayException,
  BadRequestException,
  Injectable
} from '@nestjs/common';
import {
  Payment,
  PaymentStatus,
  PaymentType
} from '../entities/payment.entity';
import { VerifyDto, VerifyResponseDto } from '../dto/response-payment.dto';
import { ConfigService } from '@nestjs/config';
import { VerifyDto as VerifyBodyDto } from '../dto/verify-payment.dto';
import { Response } from 'express';
import { User } from '../../base/entities/User';
import { SaleOrderDto } from '../../automation/operational/dto/sale-order.dto';
import path from 'path';

@Injectable()
export class PayPingService {
  constructor(
    private http: HttpService,
    private paymentService: PaymentService,
    private configService: ConfigService
  ) {}

  async createPayPingLink(data: intialPayPingDto, current: User, user: User) {
    let response;
    let payment: Payment;
    const gateway = data.gateway;

    try {
      response = await firstValueFrom(
        this.http.post(
          `${this.configService.get('PAYPING_INTIAL_URL')}`,
          {
            amount: Math.round(data.amount / 10) || 0,
            returnUrl: data.returnUrl,
            description: data.description,
            payerIdentity: data.payerIdentity,
            payerName: data.payerName
          },
          {
            headers: {
              Authorization: `Bearer ${gateway.token.trim()}`
            }
          }
        )
      );
    } catch (error) {
      console.log(error);
      if (error?.response && error?.response?.data) {
        throw new BadRequestException({
          message: Object.keys(error?.response?.data)
            .map((e) => {
              return error?.response?.data[e];
            })
            .join(',')
        });
      }
    }

    const code = response?.data?.code;
    if (!code) {
      throw new BadRequestException('Invalid code');
    } else {
      payment = new Payment();
      payment.code = response?.data?.code;
      payment.type = PaymentType.Online;
      payment.gateway = gateway;
      payment.startPayment = new Date();
      payment.bankAccount = gateway.bank;
      payment.amount = data.amount;
      payment.callback = data.returnUrl;
      payment.createdBy = current;
      payment.customer = user;
      payment.agent = data?.agent;
      payment.dto = { orders: data.orders };
      console.log('payment dto', payment.dto);
      await payment.save();
    }

    return `${this.configService.get('PAYPING_START_URL')}/${code}`;
  }

  async verifyPayPing(
    refId: string,
    code: string,
    order: SaleOrderDto[],
    current: User,
    isonlineShop: any
  ): Promise<VerifyDto> {
    let orders = [];
    let errors = [];
    console.log('isOnlineshop', isonlineShop);
    const payment = await Payment.findOne({
      where: { code },
      relations: ['gateway', 'gateway.bank', 'orders']
    });

    if (!payment) {
      throw new BadRequestException('code not found ');
    }

    payment.refId = refId;
    payment.endPayment = new Date();
    payment.dto = {
      ...payment.dto,
      refId,
      code,
      current,
      isonlineShop: isonlineShop
    };
    await payment.save();

    const [result, verifyErrors] = await this.verifyPayPingWithOutOrder(
      payment,
      errors
    );

    errors = verifyErrors;
    console.log(
      'payment.orders.length',
      payment.orders.map((e) => e.id)
    );
    if (
      (result.status !== 200 && +result.code !== 15) ||
      (result.status !== 200 &&
        +result.code === 15 &&
        payment.orders.length > 0)
    ) {
      payment.errors = errors.join(',');
      await payment.save();
      return { verifyResponse: result, orders };
    } else {
      console.log('callledddd');
      payment.status = PaymentStatus.Ok;
      await payment.save();
    }
    console.log("order && isonlineShop",)
    if (order && isonlineShop) {
      const [result, submitErr] =
        await this.paymentService.submitOrderOnlineShop(
          payment,
          order,
          current,
          verifyErrors
        );
      orders = result;
      errors = submitErr;

    } else if (order && order.length !== 0 && !isonlineShop) {
      const [result, submitErr] = await this.paymentService.submitOrder(
        payment,
        order,
        current,
        verifyErrors
      );
      orders = result;
      errors = submitErr;
 
    }
    console.log('errorswwwwwwwwwwwwwww', errors);
    // payment.errors = errors.join(',');
    // await payment.save();

    return { verifyResponse: result, orders };
  }

  async verifyPayPingLink(
    type: string,
    redirect: string,
    model: VerifyBodyDto,
    current: User,
    response: Response
  ) {
    try {
      const result = await this.verifyPayPing(
        model?.refid,
        model?.code,
        null,
        current,
        false
      );
      console.log('result is', result);

      const returnUrl =
        redirect +
        `?type=${type}&success=${
          result?.verifyResponse?.status === 200 ||
          result?.verifyResponse?.status === 201
            ? true
            : false
        }&code=${model?.code}&refId=${model?.refid}`;

      const url = path.join(
        __dirname,
        '..',
        '..',
        '..',
        'template',
        'paypingResult',
        'result.html'
      );

      return response.render(url, { url: returnUrl }, (err, html) => {
        if (err) {
          throw new BadGatewayException(err);
        } else {
          response.send(html);
        }
      });
    } catch (err) {
      throw new BadGatewayException(err?.message);
    }
  }

  async verifyPayPingWithOutOrder(
    payment: Payment,
    errors: string[]
  ): Promise<[VerifyResponseDto, string[]]> {
    let res: VerifyResponseDto = {
      code: undefined,
      message: undefined,
      card_hash: undefined,
      card_pan: undefined,
      ref_id: payment.refId,
      fee_type: undefined,
      card_number: undefined,
      fee: undefined,
      status: undefined
    };
    let response;

    try {
      response = await firstValueFrom(
        this.http.post(
          `${this.configService.get('PAYPING_VERIFY_URL')}`,
          {
            amount: Math.round(payment.amount / 10),
            refId: payment.refId
          },
          {
            headers: {
              Authorization: `Bearer ${payment?.gateway?.token.trim()}`
            }
          }
        )
      );
    } catch (error) {
      if (error?.response?.data) {
        res.code = +Object.keys(error?.response?.data)
          .map((e) => e)
          .join(',');
        res.message = Object.keys(error?.response?.data)
          .map((e) => error?.response?.data[e])
          .join(',');
          if (res.code !== 15) {
            //تراکنش تکراری 
            payment.status = PaymentStatus.Reject;
          errors.push(res.message);
        }
      } else {
        payment.status = PaymentStatus.Nok;
        errors.push(error?.message);
      }
      res.status = 400;
      // payment.errors=errors.join(',')
      await payment.save();
      return [res, errors];
    }

    console.log('response', response?.data, response.status);

    if (response?.data && response.status === 200) {
      res = {
        ...res,
        card_hash: response?.data?.cardHashPan,
        card_number: response?.data?.cardNumber
      };
      payment.status = PaymentStatus.Ok;
      payment.cardPan = res?.card_number;
      payment.cardHash = res?.card_hash;
      payment.refId = res?.ref_id;
      payment.fee = payment.fee;
      await payment.save();
    }

    res.status = 200;
    return [res, errors];
  }
}
