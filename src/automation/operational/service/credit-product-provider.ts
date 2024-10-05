import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { User } from '../../../base/entities/User';
import moment from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { UsersService } from '../../../auth/service/users.service';
import { ProductService } from '../../base/service/product.service';
import { SaleItemDto } from '../dto/sale-order.dto';
import { TransactionService } from './transaction.service';
import { RegisteredServiceStatus, SaleItem } from '../entities/SaleItem';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { ProductPrice } from '../../base/entities/ProductPrice';
import { Product } from '../../base/entities/Product';
import { ProductCategory } from '../../base/entities/ProductCategory';
import { ContractorService } from '../../base/service/contractor.service';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';


@Injectable()
export class CreditProductProvider {
  constructor(
    private userService: UsersService,
    private productService: ProductService,
    private transactions: TransactionService,
    private contractorService: ContractorService,
    private datasource: DataSource
  ) {}

  async upsert(
    dto: SaleItemDto,
    item: SaleItem,
    product: Product,
    saleUnit: SaleUnit,
    current: User,
    manager: EntityManager
  ) {
    let serviceItem: SaleItem = item;
    if (!item) {
      serviceItem = new SaleItem();
      serviceItem.isOnline = dto.isOnline;
      serviceItem.product = product;
      serviceItem.title = product.title;
      serviceItem.type = SaleUnitType.Credit;
      serviceItem.saleUnit = saleUnit;
      serviceItem.category = { id: product.categoryId } as ProductCategory;
      serviceItem.manualPrice = false;
      serviceItem.isTransfer = !!dto.isTransfer;
      serviceItem.isCashBack = !!dto.isCashBack;
      serviceItem.isGift = !!dto.isGift;
      serviceItem.returnCredit = 0;
      serviceItem.tax = product.tax || 0;
      serviceItem.quantity = 1;
      serviceItem.status = RegisteredServiceStatus.opened;
      serviceItem.createdBy = current;
      serviceItem.withGuest = false;
      serviceItem.submitAt = dto.submitAt;
      serviceItem.defaultDiscount = product.discount || 0;
      serviceItem.persons = 0;
      serviceItem.description = dto.description;
      serviceItem.isPaymentContractor = dto.isPaymentContractor;
    }

    if (dto.unFairPenaltyQuantity) {
      serviceItem.unFairPenaltyQuantity = dto.unFairPenaltyQuantity;
    }

    serviceItem.description = dto.description;
    if (!dto.start) {
      if (!serviceItem.start) serviceItem.start = dto.submitAt;
    } else {
      let start = moment(dto.start, AppConstant.DATE_FORMAT);
      if (moment(serviceItem.submitAt).isAfter(start, 'date')) {
        throw new BadRequestException('Invalid start date');
      }
      serviceItem.start = start.toDate();
    }

    if (dto.end) {
      serviceItem.end = moment(dto.end, AppConstant.DATE_FORMAT).toDate();
    }

    if (moment(serviceItem.start).isAfter(moment(serviceItem.end), 'date')) {
      throw new BadRequestException('Invalid end date');
    }
    console.log('credit is cash back', dto.isCashBack);
    if (serviceItem.usedCredit == 0) {
      if (saleUnit.allowDiscount || dto.parent)
        serviceItem.discount = dto.discount || 0;
      else serviceItem.discount = product.discount || 0;
    }
    if (
      !serviceItem.isTransfer &&
      !serviceItem.isGift &&
      !serviceItem.isCashBack
    ) {
      if (serviceItem.usedCredit == 0) {
        let pricePolicy: ProductPrice;
        if (!dto.parent) {
          if (product.hasPriceList) {
            if (product.priceList?.length) {
              if (dto.priceId) {
                pricePolicy = product.priceList?.find(
                  (p) => p.id == dto.priceId
                );
              } else if (dto.duration) {
                pricePolicy = product.priceList?.find(
                  (p) => p.min == dto.duration
                );
              }
            } else {
              if (dto.priceId) {
                pricePolicy = await this.productService.findPriceById(
                  product.id,
                  dto.priceId,
                  manager
                );
              } else if (dto.duration) {
                pricePolicy = await this.productService.findPriceByDuration(
                  product.id,
                  dto.duration,
                  manager
                );
              }
            }
            if (!pricePolicy) {
              throw new BadRequestException('Not found service price');
            }
            serviceItem.price = pricePolicy.price;
            serviceItem.priceId = pricePolicy.id;
          } else {
            serviceItem.price = product.price;
          }
        }
        if (dto.manualPrice && dto.amount) {
          serviceItem.price = dto.price;
          serviceItem.amount = dto.amount;
          serviceItem.manualPrice = dto.manualPrice;
        } else {
          serviceItem.amount = serviceItem.price;
          serviceItem.manualPrice = false;
        }
        let duration = dto.parent
          ? dto.duration
          : dto.duration || product.duration || 0;
        if (!serviceItem.end) {
          serviceItem.end = moment(serviceItem.start)
            .add(duration, 'days')
            .toDate();
        }
        if (!serviceItem.end) {
          serviceItem.end = moment(serviceItem.start)
            .add(duration, 'days')
            .toDate();
        }

        // let credit = product?.price || dto.price;
        let credit = dto?.price ?? product?.price;
        if (!credit) {
          throw new BadRequestException('Not found credit');
        }
        serviceItem.credit = credit;
      }
    } else {
      if (serviceItem.isTransfer) {
        serviceItem.credit = dto.credit;
        serviceItem.usedCredit = 0;
        serviceItem.price = dto.price;
        serviceItem.amount = dto.price;
      } else {
        serviceItem.credit = dto.price;
        serviceItem.usedCredit = dto.usedCredit || 0;
        serviceItem.price = dto.price;
        serviceItem.amount = dto.price;
      }
    }
    // if (serviceItem.discount > serviceItem.totalAmount) {
    //   throw new BadRequestException('Invalid discount amount');
    // }
    if (serviceItem.totalAmount < 0) {
      throw new BadRequestException('Amount is zero');
    }
    serviceItem.status = RegisteredServiceStatus.opened;
    if (product.hasPartner) {
      let pcl = await this.contractorService.processPartnerIncome(
        serviceItem,
        product,
        current,
        manager
      );
      if (pcl?.length) {
        serviceItem.contractorIncomes = [
          ...pcl,
          ...serviceItem.contractorIncomes
        ];
      }
    }
    return serviceItem;
  }
}
