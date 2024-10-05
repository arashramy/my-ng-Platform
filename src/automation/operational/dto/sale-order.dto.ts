import { Operation } from '../../../common/interceptors/access-organization-fiscal-year.interceptor';
import { ApiProperty } from '@nestjs/swagger';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';

import { TransactionSourceType } from '../../../base/entities/TransactionSource';
import { SubProduct } from '../../../automation/base/entities/SubProduct';
import { Project } from '../../../project-management/operational/entities/Project';
import { SaleOrder } from '../entities/SaleOrder';
import { Event } from '../../../automation/base/entities/Event';
import { ProductCategory } from '../../../automation/base/entities/ProductCategory';

export class SaleItemDto {
  isOnline?: boolean;
  eventSelectedPriceId?: number;
  reservedEndTime?: string;
  reservedStartTime?: string;
  reservedDate?: string;
  id?: number;
  product?: number;
  subProduct?: SubProduct;
  isReserve?: boolean;
  duration?: number;
  quantity?: number;
  locker?: number;
  applyAfterEndTime?: boolean;
  discount?: number;
  price?: number;
  credit?: number;
  tax?: number;
  amount?: number;
  isTransfer?: boolean;
  manualPrice?: boolean;
  type?: SaleUnitType;
  contractor?: number;
  registeredService?: number;
  groupClassRoom?: number;
  usedCredit?: number;
  start?: string;
  end?: string;
  isFree?: boolean;
  parent?: number;
  priceId?: number;
  submitAt?: Date;
  user?: number;
  orgUnit?: number;
  persons?: number;
  isArchived?: boolean;
  returnBackContractorIncomeType?: boolean;
  description?: string;
  items?: SaleItemDto[];
  isGift?: boolean;
  isCashBack?: boolean;
  deliveredItems?: any[];
  isPaymentContractor?: boolean;
  unFairPenaltyQuantity?: number;
}

export class TransactionItem {
  @ApiProperty()
  id?: number;
  @ApiProperty()
  type?: TransactionSourceType;
  @ApiProperty()
  source?: number;
  @ApiProperty()
  title?: string;
  @ApiProperty()
  code?: string;
  @ApiProperty()
  amount?: number;
  @ApiProperty()
  user?: number;
  @ApiProperty()
  description?: string;
  @ApiProperty()
  submitAt?: any;
  @ApiProperty()
  isArchived?: boolean;
  meta?: any;
  fromGuest?: boolean;
}

export class SaleOrderDto extends Operation {
  parentSubProductOrders?: SaleOrder;
  description?: string;
  @ApiProperty()
  id?: number;

  isTransfer?: boolean;

  @ApiProperty()
  isCreatedByDevice?: boolean;

  event?: Event;
  productCategory?: ProductCategory;

  preSettleSourceId?: number;

  @ApiProperty()
  user: number = null;

  @ApiProperty()
  payment?: number;

  @ApiProperty()
  loan?: number;

  @ApiProperty()
  organizationUnit?: number;

  @ApiProperty()
  saleUnit: number;

  @ApiProperty()
  submitAt?: string;

  @ApiProperty()
  end?: string;

  @ApiProperty()
  settle?: boolean;

  @ApiProperty({ type: [SaleItemDto] })
  items?: SaleItemDto[];

  @ApiProperty({ type: [Number] })
  lockers?: number[];

  @ApiProperty()
  lockerQuantity?: number;

  @ApiProperty()
  freeReception?: boolean;

  @ApiProperty()
  isArchived?: boolean;

  @ApiProperty({ type: [TransactionItem] })
  transactions?: TransactionItem[];

  isReserve?: boolean;

  @ApiProperty()
  isGift?: boolean;

  @ApiProperty()
  project?: Project;
  @ApiProperty()
  isCachedBack?: boolean;

  cashBackParent?: number;

  @ApiProperty()
  location?: string;

  @ApiProperty()
  transferType?: string;

  @ApiProperty()
  saleStatus?: number;

  @ApiProperty()
  isBurn?: boolean;

  userOrderLocker?: number;
}
