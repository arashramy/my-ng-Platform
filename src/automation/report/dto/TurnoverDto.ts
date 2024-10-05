import { Expose, Transform } from 'class-transformer';
import { TransactionType } from '../../operational/entities/Transaction';
import { TransactionSourceType } from '../../../base/entities/TransactionSource';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';

export class FetchTransactionDto {
  @Transform((params) => (params?.value ? +params.value : 0))
  bankId?: number;
  bankTitle?: string;
  @Transform((params) => (params?.value ? +params.value : 0))
  cashId?: number;
  cashTitle?: string;
  type?: TransactionType;
  @Transform((params) => (params?.value ? +params.value : 0))
  cashAmount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  bankAmount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  giftAmount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  totalAmount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  count?: number;
}

export class GeneralReportDto {
  @Transform((params) => (params?.value ? +params.value : 0))
  id?: number;
  title?: string;
  @Transform((params) => (params?.value ? +params.value : 0))
  amount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  count?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  discount?: number;
}

export enum TransactionReportType {
  Deposit = 'Deposit',
  Settle = 'Settle',
  Return = 'Return',
  Withdraw = 'Withdraw',
  Gift = 'Gift',
  DeltaCredit = 'DeltaCredit'
}

export interface DeltaCreditDto {
  low?: number;
  high?: number;
  delta?: number;
}

export interface TransactionTypeReportDto {
  banks?: GeneralReportDto[];
  cashes?: GeneralReportDto[];
}

export class TransactionReportOutputDto {
  [key: string]: TransactionTypeReportDto | GeneralReportDto | DeltaCreditDto;
}

export class RegisteredServiceReportDto {
  @Transform((params) => (params?.value ? +params.value : 0))
  id?: number;
  title?: string;
  @Transform((params) => (params?.value ? +params.value : 0))
  totalAmount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  settleAmount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  discount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  count?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  contractorIncome?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  contractorIncomeAfterDiscount?: number;
  @Transform((params) => params)
  org_unit?: number;
  @Transform((param) => {
    console.log('parammm', param);
    return param.value ? param.value : 0;
  })
  saleOrder: any;

  @Expose()
  get finalAmount() {
    return this.totalAmount - this.discount;
  }
}
export class ReceptionReportDto {
  @Transform((params) => (params?.value ? +params.value : 0))
  totalMainServiceAmount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  totalSecondaryServiceAmount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  totalShopSaleAmount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  discount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  count?: number;

  @Expose()
  get finalAmount() {
    return (
      this.totalMainServiceAmount +
      this.totalSecondaryServiceAmount +
      this.totalShopSaleAmount -
      this.discount
    );
  }
}

export class SettlementAmountReportDto {
  @Transform((params) => (params?.value ? +params.value : 0))
  settleAmount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  count?: number;
}
// export class TurnoverDto {
//   Input: any[];
//   Sale: {
//     RegisteredService: RegisteredServiceReportDto[];
//     Archived: RegisteredServiceReportDto[];
//     Shop: RegisteredServiceReportDto[];
//     Reception: GeneralReportDto[];
//     Settle: SettlementAmountReportDto;
//   };
// }

export class OrderTurnover {
  id?: number;
  title?: string;
  @Transform((params) => (params?.value ? +params.value : 0))
  type?: SaleUnitType;
  @Transform((params) => (params?.value ? +params.value : 0))
  count?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  quantity?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  amount?: number;
}

export class TransactionTurnover {
  @Transform((params) => (params?.value ? +params.value : 0))
  saleUnitId?: number;
  saleUnit?: string;
  @Transform((params) => (params?.value ? +params.value : 0))
  type?: TransactionType;
  @Transform((params) => (params?.value ? +params.value : 0))
  sourceType?: TransactionSourceType;
  @Transform((params) => (params?.value ? +params.value : 0))
  source?: number;
  sourceTitle?: string;
  @Transform((params) => (params?.value ? +params.value : 0))
  count?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  amount?: number;
}

export class TurnoverDto {
  orders: { order: OrderTurnover[]; notSettled: OrderTurnover[] };
  transactions: TransactionTurnover[];
  saleItems: { saleItem: OrderTurnover[]; discount: any };
  tags: any;
  taxs:any
  transferSaleItem:any
}

export class LostServiceDto {
  @Transform((params) => (params?.value ? +params.value : 0))
  type?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  count?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  totalAmount?: number;
}

export class LostServiceDetailDto {
  @Transform((params) => (params?.value ? +params.value : 0))
  registeredCount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  totalAmount?: number;
}
