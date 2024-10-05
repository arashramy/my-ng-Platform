import { BadRequestException, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import {
  Payment,
  PaymentStatus,
  PaymentType
} from '../entities/payment.entity';
import { PaymentService } from '../payment.service';
import { VerifyDto, VerifyResponseDto } from '../dto/response-payment.dto';
import { stripeProductDto } from '../dto/create-payment-link.dto';
import { SaleOrderService } from '../../automation/operational/service/sale-order.service';
import { User } from '../../base/entities/User';
import { Gateway } from '../../base/entities/Gateway';
import { SaleOrderDto } from '../../automation/operational/dto/sale-order.dto';

let stripe: Stripe | undefined;

// let stripe=require("stripe")

@Injectable()
export class StripeService {
  constructor(
    private saleOrderService: SaleOrderService,
    private paymentService: PaymentService
  ) {}

  async createStripeLink(
    body: stripeProductDto[],
    user: User,
    gateway: Gateway,
    callbackUrl: string,
    current: User
  ) {
    stripe = require('stripe')(gateway.token);
    try {
      const reqBody: { price: string; quantity: number }[] = [];
      for (let i = 0; i < body.length; i++) {
        const item = body[i];

        const product = await stripe.products.create({
          name: item.title
          // images: item?.image ? [item.image] : undefined,
        });
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: item.price * 100,
          currency: 'usd'
        });
        reqBody.push({
          price: price.id,
          quantity: item.quantity
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: reqBody,
        success_url: `${callbackUrl}&session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${callbackUrl}&session_id={CHECKOUT_SESSION_ID}&success=false`
      });

      let payment = new Payment();
      payment = new Payment();
      payment.stripeId = session.id;
      payment.type = PaymentType.Online;
      payment.gateway = gateway;
      payment.startPayment = new Date();
      payment.bankAccount = gateway.bank;
      payment.amount = session.amount_total;
      payment.customer = user;
      payment.createdBy = current;
      await payment.save();
      // session.has
      return session.url;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async verifyStripeCheckout(
    id: string,
    body: SaleOrderDto[],
    current: User,
    isOnlineshop: boolean
  ): Promise<VerifyDto> {
    let errors=[]  // dont save to payment 
    const payment = await Payment.findOne({
      where: { stripeId: id },
      relations: ['gateway', 'gateway.bank']
    });
    if (!payment) {
      throw new BadRequestException('Invalid payment');
    }
    stripe = require('stripe')(payment.gateway.token);
    const session = await stripe.checkout.sessions.retrieve(id);

    let orders = [];

    payment.dto=body
    payment.endPayment=new Date()
    await payment.save()

    if (session.payment_status === 'paid') {
      payment.status = PaymentStatus.Ok;
      payment.callback = session.return_url;

      if (body && body.length !== 0 && !isOnlineshop) {
        orders = await this.paymentService.submitOrder(payment, body, current,errors);
      } else if (body && body.length !== 0 && isOnlineshop) {
        orders = await this.paymentService.submitOrderOnlineShop(
          payment,
          body,
          current,
          errors
        );
      }
      await payment.save();
      return { verifyResponse: { message: 'success', status: 200 }, orders };
    } else {
      // payment.status = PaymentStatus.Nok;
      // await payment.save();
      payment.status = PaymentStatus.Ok;
      payment.callback = session.return_url;

      if (body && body.length !== 0 && !isOnlineshop) {
        orders = await this.paymentService.submitOrder(payment, body, current,errors);
      } else if (body && body.length !== 0 && isOnlineshop) {
        orders = await this.paymentService.submitOrderOnlineShop(
            payment,
            body,
            current,
            errors
        );
      }
      await payment.save();
      return { verifyResponse: { message: 'success', status: 200 }, orders };
    }
    return {
      verifyResponse: {
        message: 'failed ...',
        status: +session.payment_status
      },
      orders
    };
  }
}
