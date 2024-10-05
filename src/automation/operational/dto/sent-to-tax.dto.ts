import { SaleOrder } from '../entities/SaleOrder';

export enum personType {
  Genuine = 1, // حقیقی
  Legal = 2, //حقوقی
  CivilPartnership = 3, // مشارکت مدنی
  Citizens = 4
}

export enum invoiceSubjectType {
  Sale = 1, //فروش
  Edit = 2, // اصلاحی
  Delete = 3, // ابطال
  ReturnFromSale = 4 // برگشت از فروش
}

export enum invoiceSettlementMethodType {
  Cash = 1 //نقدی
}

export enum invoiceTaxType {
  WithCustomer = 1, //با خریدار
  WithoutCustomer = 2 // بدون خریدار
}

export class invoiceDetailsDto {
  externalID: string; // id prodcuts
  // externaProductCode: string // شناسه عمومی یا اختصاصی
  externaProductName: string;
  externaProductTaxID: string; // unique code product
  externaTaxRate: number = 0;
  externaLegalAmountRate: number = 0; // باید 0
  externaOtherTaxRate: number = 0; // 0
  productDescription: string; // product description
  value: number = 1; // quantity
  unitAmount: number = 0; // price
  discountAmount: number = 0; // discount
  taxRate: number = 0; //tax
  otherTaxRate: number = 0; // 0
  legalAmountRate: number = 0; // 0
  externaProductCode:string
}

export class invoiceDTOs {
  personExternalID: string; //id user
  personTypeID: personType; //  1 hagghi 2 3 4
  name: string;
  lastName: string;
  economicCode: string;
  nationalCode: string;
  invoiceDate: string;
  invoiceSubjectID: invoiceSubjectType; // 1 ta 4
  invoiceSettlementMethodID: invoiceSettlementMethodType; //1 cash
  cashPaymentAmount: number = 0; //0
  loanPaymentAmount: number = 0; // 0
  invoiceTaxTypeID: invoiceTaxType; // 1 or 2
  invoiceExternalID: string; // id sale order
  invoiceDetails: invoiceDetailsDto[];
}

export class SentToTaxResDto {
  order: SaleOrder;
  orderIds: number[];
}
