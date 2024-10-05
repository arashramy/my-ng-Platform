import {Operation} from '../../../common/interceptors/access-organization-fiscal-year.interceptor';
import {BailType} from "../../base/entities/Loan";

export interface InstallmentLoanDto {
  id?: number;
  amount?: number;
  cheque?: number;
  payTime?: any;
  description?: string;
}

export class UserLoanDto extends Operation {
  id?: number;
  user: number;
  loan?: number;
  amount?: number;
  interestRate?: number;
  lateFeesRate?: number;
  noPenaltyRange?: number;
  installments: number;
  installmentsPeriod: number;
  submitAt?: string;
  start?: string;
  bailType: BailType;
  cheque?: number;
  userBail?: number;
  doc?: number;
  items?: InstallmentLoanDto[];
  saleUnit?: number;
  description?: string;
}
