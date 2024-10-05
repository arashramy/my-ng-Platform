import { SaleOrderDto } from "../../automation/operational/dto/sale-order.dto";

export class VerifyDto {
  refId: string;
  stripId:string
  code: string;
  authority: string;
  orders: SaleOrderDto[];
  isonlineShop: boolean;
  refid:string
}
