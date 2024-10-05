import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, Not } from 'typeorm';
import { User } from '../../../base/entities/User';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionService } from './transaction.service';
import { RegisteredServiceStatus, SaleItem } from '../entities/SaleItem';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';
import { ProductType } from '../../base/entities/ProductCategory';
import { TransactionSourceType } from '../../../base/entities/TransactionSource';
import { OrganizationUnit } from '../../../base/entities/OrganizationUnit';
import { FiscalYear } from '../../../base/entities/FiscalYears';
import {
  SaleItemDto,
  SaleOrderDto,
  TransactionItem
} from '../dto/sale-order.dto';
import { SaleOrderService } from './sale-order.service';
import moment from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';
import { PermissionKey } from '../../../common/constant/auth.constant';
import { RemoteAction } from '../../../common/sse/sse.service';
import { CrudAction } from '../../../common/sse/sse.service';
import { Product } from '../../../automation/base/entities/Product';

@Injectable()
export class ArchivedProvider {
  constructor(
    private transactions: TransactionService,
    private saleOrderService: SaleOrderService,
    private datasource: DataSource,
    private eventEmitter: EventEmitter2
  ) {}

  async archived(
    id: number,
    amount: number,
    returnBackContractorIncomeType: boolean,
    current: User,
    type?: number
  ) {
    return this.datasource.manager.transaction(async (manager) => {
      const item = await manager.findOne(SaleItem, {
        where: { id: id, status: RegisteredServiceStatus.opened },
        relations: ['product', 'user', 'saleOrder']
      });

      if (!item) {
        throw new BadRequestException('Not found service');
      }
      console.log(item.type, item.unlimited);
      if (
        item.type === SaleUnitType.Package &&
        (item.product.unlimited || item.product.isLocker)
      ) {
        console.log(item.finalAmountWithoutTax, item.totalAmount);
        if (item.finalAmountWithoutTax < (amount || 0)) {
          throw new BadRequestException('Invalid amount');
        }
      } else if (
        item.type == SaleUnitType.Service &&
        (item.product.unlimited || item.product.isLocker)
      ) {
        if (item.finalAmountWithoutTax < (amount || 0)) {
          throw new BadRequestException('Invalid amount');
        }
      } else if (item.credit - item.usedCredit < (amount || 0)) {
        throw new BadRequestException('Invalid amount');
      }
      let returnValue = amount - item.discount;
      if (
        item.type == SaleUnitType.Service &&
        !(item.product.unlimited || item.product.isLocker)
      ) {
        const taxAmount = Math.round(
          Math.round(
            (amount || 0) * (item.price || 0) -
              (item.returnCredit || 0) -
              (item.discount || 0)
          ) *
            ((item.tax || 0) / 100)
        );
        const finalAmountWithoutTax = Math.round(
          (amount || 0) * (item.price || 0) -
            (item.returnCredit || 0) -
            (item.discount || 0)
        );
        console.log('taxamount + ', taxAmount + finalAmountWithoutTax);
        returnValue = finalAmountWithoutTax;
      }

      let trx;
      if (returnValue > 0) {
        trx = await this.transactions.doDeposit(
          {
            items: [
              {
                amount: returnValue,
                source: item.id,
                type: TransactionSourceType.Archived,
                title: item.title
              }
            ]
          },
          { id: item.saleUnitId } as SaleUnit,
          { id: item.organizationUnitId } as OrganizationUnit,
          { id: item.fiscalYearId } as FiscalYear,
          null,
          item.user,
          new Date(),
          false,
          false,
          current,
          manager
        );
      }

      let saleItemDto: SaleItemDto;
      let trxDto: TransactionItem[];
      const remain = item.credit - item.usedCredit - amount;
      if (
        item.type == SaleUnitType.Service &&
        !(item.product.unlimited || item.product.isLocker)
      ) {
        if (remain >= 0) {
          saleItemDto = {
            type: SaleUnitType.Reception,
            persons: 1,
            quantity: amount,
            registeredService: item.id,
            isArchived: true,
            product: item.productId,
            returnBackContractorIncomeType: returnBackContractorIncomeType
          };
        }
      } else if (item.type == SaleUnitType.Credit) {
        if (remain >= 0) {
          saleItemDto = {
            type: SaleUnitType.Product,
            persons: 0,
            manualPrice: true,
            quantity: 1,
            amount: remain,
            price: remain,
            product: (await this.getDefaultProduct())?.id,
            isArchived: true
          };
          trxDto = [
            {
              type: TransactionSourceType.ChargingService,
              amount: remain,
              description: item.title,
              source: item.id,
              user: item.user?.id || item.userId,
              isArchived: true
            }
          ];
        }
      }

      if (saleItemDto) {
        const order: SaleOrderDto = {
          items: [saleItemDto],
          user: item.userId,
          saleUnit: item.saleOrder.saleUnitId,
          organizationUnit: item.saleOrder.organizationUnitId,
          isArchived: true,
          transactions: trxDto
        };
        await this.saleOrderService.doSubmit(order, current, manager);
      }

      console.log(150, returnValue);

      await manager.update(SaleItem, id, {
        archivedTime: new Date(),
        updatedAt: new Date(),
        updatedBy: current,
        status: type ? type : RegisteredServiceStatus.archived,
        returnCredit: returnValue
      });

      this.eventEmitter.emitAsync(EventsConstant.CLIENT_REMOTE, {
        key: PermissionKey.AUTOMATION_OPT_ORDERS,
        type: EventsConstant.ORDER_SAVE,
        action: RemoteAction.DataTable,
        data: {
          action: CrudAction.Refresh,
          data: {
            id: item.id,
            user: item?.user?.id || item.userId,
            [SaleUnitType.Service]: item?.type == SaleUnitType.Service,
            [SaleUnitType.Credit]: item?.type == SaleUnitType.Credit,
            [SaleUnitType.Package]: item.type == SaleUnitType.Package,
          }
        }
      });
      return [item.saleOrder, trx];
    });
  }

  async getDefaultProduct() {
    const products = await Product.find({
      where: { title: 'Archived' },
      take: 1
    });
    if (products?.length) {
      return products[0];
    }
    const product = new Product();
    product.title = 'Archived';
    product.manualPrice = true;
    product.type = ProductType.Product;
    product.price = 0;
    product.unlimited = false;
    product.isLocker = false;
    await product.save();
    return product;
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async archiveService() {
    const saleItems = await SaleItem.createQueryBuilder('q')
      .leftJoinAndSelect('q.product', 'product')
      // .where([
      //   {
      //     status: RegisteredServiceStatus.opened,
      //     type: SaleUnitType.Service,
      //     unlimited: false,
      //     product: {
      //       isLocker: false
      //     }
      //   },
      //   {
      //     status: RegisteredServiceStatus.opened,
      //     type: SaleUnitType.Credit
      //   }
      // ])
      .where('q.status=:status', { status: RegisteredServiceStatus.opened })
      .andWhere(
        '((q.type=:registered_type AND q.unlimited=false AND product.isLocker=false) OR (q.type=:creditType))',
        {
          registered_type: SaleUnitType.Service,
          creditType: SaleUnitType.Credit
        }
      )
      .andWhere(
        `(((q.end + (INTERVAL '1 day' * product.convert_to_income_after_days)) < :end) OR (q.credit-q.used_credit=0))`,
        {
          end: moment()
            .add(-1, 'day')
            .endOf('day')
            .format(AppConstant.DATETIME_FORMAT)
        }
      )
      .getMany();
    console.log(
      'date time archive',
      moment().add(-1, 'day').endOf('day').format(AppConstant.DATETIME_FORMAT)
    );
    for (const item of saleItems) {
      item.status = RegisteredServiceStatus.archived;
      item.archivedTime = new Date();
      item.returnCredit = 0;
      await item.save();
    }
  }
}
