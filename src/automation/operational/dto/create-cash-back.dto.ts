import { User } from '../../../base/entities/User';
import { SaleItemDto } from './sale-order.dto';

export interface CreateCashBackDto {
  items: SaleItemDto[];
  settleAmount: number;
  totalAmount: number;
  submitAt: string;
  userId: number;
  orgUnitId: number;
  saleUnitId: number;
  current: User;
  fiscalYearId: number;
  cashBackParent: any;
}
