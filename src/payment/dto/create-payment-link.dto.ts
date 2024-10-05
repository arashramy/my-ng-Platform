import { SaleOrderDto } from '../../automation/operational/dto/sale-order.dto';
import { Gateway } from '../../base/entities/Gateway';

export class CreatePaymentDto {}

export class intialPaymentDto {
  gateway?: string;
  customer: number;
  amount?: number;
  description?: string;
  callbackUrl: string;
  saleUnit?: number;
  products?: stripeProductDto[];
  orders?: SaleOrderDto[];
  agent?: string;
}

export class stripeProductDto {
  title: string;
  price: number;
  quantity: number;
  image?: string;
  tax?: number;
}

export class intialZarinPalDto {
  gateway: Gateway;
  mobile: string;
  amount: number;
  description: string;
  callback_url: string;
}

export class intialPayPingDto {
  amount: number;
  returnUrl: string;
  payerName?: string;
  description: string;
  payerIdentity?: string;
  gateway: Gateway;
  orders?: SaleOrderDto[];
  agent?: string;
}
