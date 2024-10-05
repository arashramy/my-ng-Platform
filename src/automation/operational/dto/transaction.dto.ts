import { Transform } from 'class-transformer';
import { Operation } from '../../../common/interceptors/access-organization-fiscal-year.interceptor';
import { TransactionItem } from './sale-order.dto';
import { Export } from '../../../common/decorators/export.decorator';

export class TransactionDto extends Operation {
  user?: number = null;
  items?: TransactionItem[];
  submitAt?: string;
  amount?: number;
  saleUnit?: number;
}

export class WithdrawDto extends Operation {
  submitAt?: string;
  amount?: number;
  user?: number = null;
  description?: string;
  saleUnit?: number;
}

@Export<TransactionReportTotalBaseUser>({
  name: 'TransactionReportTotalBaseUser',
  translateKey: 'AUTOMATION_REPORT_TRANSACTION_BASE_USER',
  defaultSelect: [
    'id',
    'code',
    'firstName',
    'lastName',
    'mobile',
    'totalAmount',
    'cashAmount',
    'bankAmount'
  ],
  columns: {}
})
export class TransactionReportTotalBaseUser {
  @Transform((params) => params.value)
  id?: number;
  @Transform((params) => params.value)
  code?: number;
  @Transform((params) => params.value)
  firstName?: string;
  @Transform((params) => params.value)
  lastName?: string;
  @Transform((params) => params.value)
  mobile?: string;
  @Transform((params) => (params?.value ? +params.value : 0))
  totalAmount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  cashAmount?: number;
  @Transform((params) => (params?.value ? +params.value : 0))
  bankAmount?: number;
}
