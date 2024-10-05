import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SaleItem } from '../entities/SaleItem';
import { User } from '../../../base/entities/User';
import { ProductService } from '../../base/service/product.service';
import { SaleItemDto } from '../dto/sale-order.dto';
import { SaleUnit,  } from '../../../base/entities/SaleUnit';
import { ContractorService } from '../../base/service/contractor.service';
import { Product } from '../../base/entities/Product';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';

import {
  ProductCategory,
  ProductType
} from '../../base/entities/ProductCategory';
import moment from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { ProductItemService } from './product-item.service';
import { CreditProductProvider } from './credit-product-provider';
import { RegisteredProductProvider } from './registered-product-provider';
import { SubProduct } from '../../base/entities/SubProduct';

@Injectable()
export class PackageItemService {
  constructor(
    private productService: ProductService,
    private contractorService: ContractorService,
    private productItemService: ProductItemService,
    private registeredProductProvider: RegisteredProductProvider,
    private creditProductProvider: CreditProductProvider
  ) {}

  async upsert(
    dto: SaleItemDto,
    item: SaleItem,
    product: Product,
    saleUnit: SaleUnit,
    current: User,
    entityManager: EntityManager
  ) {
    dto.items ||= [];
    let out = item;
    if (out) {
      out.updatedBy = current;
    } else {
      out = new SaleItem();
      out.product = product;
      out.type = SaleUnitType.Package;
      out.title = product.title;
      out.saleUnit = saleUnit;
      out.category = { id: product.categoryId } as ProductCategory;
      out.manualPrice = false;
      out.quantity = 1;
      out.tax = product.tax || 0;
      out.price = product.price;
      out.amount = product.price;
      out.createdBy = current;
      out.withGuest = false;
      out.usedCredit = 0;
      out.submitAt = dto.submitAt;
      out.persons = 0;
      out.defaultDiscount = product.discount || 0;
      out.isPaymentContractor=dto.isPaymentContractor
    }
    out.description = dto.description;
    if (!dto.start) {
      if (!out.start) out.start = dto.submitAt;
    } else {
      const startMoment = moment(dto.start, AppConstant.DATE_FORMAT);
      if (moment(out.submitAt).isAfter(startMoment, 'date')) {
        throw new BadRequestException('Invalid start date');
      }
      out.start = startMoment.toDate();
    }

    if (dto.end) {
      out.end = moment(dto.end, AppConstant.DATE_FORMAT).toDate();
    } else {
      out.end = moment(out.start).add(dto.duration, 'day').toDate();
    }

    if (
      moment(out.start).isAfter(moment(out.end), 'date') ||
      moment(out.end).isBefore(moment(), 'date')
    ) {
      throw new BadRequestException('Invalid end date');
    }
    let changedDiscount = false;
    if (saleUnit?.allowDiscount) {
      if (out.discount != dto.discount) {
        changedDiscount = true;
      }
      out.discount = dto.discount || 0;
    } else out.discount = product.discount || 0;
    if (out.totalAmount < 0) {
      throw new BadRequestException('Amount is zero');
    }
    if (!out.id) {
      out.items = await this.createSubItems(
        dto,
        product,
        saleUnit,
        current,
        entityManager
      );
    } else {
      await this.updateSubItems(
        item,
        dto,
        changedDiscount,
        current,
        entityManager
      );
    }
    const taxAmount = out.items
      ?.map((item) => item.taxAmount)
      ?.reduce((a, b) => (a || 0) + (b || 0), 0);
    out.tax = (taxAmount * 100) / out.finalAmountWithoutTax;
    return out;
  }

  async createSubItems(
    parent: SaleItemDto,
    product: Product,
    saleUnit: SaleUnit,
    current: User,
    manager: EntityManager
  ) {
    const subProducts = await this.productService.findSubProducts(product.id);
    const items = subProducts?.map((sub) => this.prepareSubItem(sub, parent));
    if (!items?.length) {
      throw new BadRequestException('Package invalid product items.');
    }
    this.calculateDiscountItems(items, parent, product);
    const out = [];
    for (const dtoItem of items) {
      dtoItem.duration = product.duration;
      let saleItem;
      switch (dtoItem.subProduct.product.type) {
        case ProductType.Service:
          dtoItem.type = SaleUnitType.Service;
          saleItem = await this.registeredProductProvider.upsert(
            dtoItem,
            null,
            dtoItem.subProduct.product,
            saleUnit,
            current,
            manager
          );
          break;
        case ProductType.Credit:
          dtoItem.type = SaleUnitType.Credit;
          saleItem = await this.creditProductProvider.upsert(
            dtoItem,
            null,
            dtoItem.subProduct.product,
            saleUnit,
            current,
            manager
          );
          break;
        default:
          dtoItem.type = SaleUnitType.Product;
          saleItem = await this.productItemService.upsert(
            dtoItem,
            null,
            dtoItem.subProduct.product,
            saleUnit,
            current,
            manager
          );
      }
      saleItem.defaultDiscount =
        (dtoItem.subProduct.discount || 0) * (dtoItem.subProduct.quantity || 0);
      out.push(saleItem);
    }

    return out;
  }

  prepareSubItem(sub: SubProduct, parentDto: SaleItemDto) {
    const item = parentDto?.items?.find(
      (item) => item.product === sub.productId
    );
    const dtoItem: SaleItemDto = {
      product: sub.productId,
      subProduct: sub,
      start: parentDto.start,
      end: parentDto.end,
      quantity: sub.quantity || 1,
      priceId: sub.priceId,
      manualPrice: true,
      contractor: item?.contractor || sub.contractorId,
      submitAt: parentDto.submitAt,
      tax: sub?.product.tax,
      discount: sub.discount * (sub.quantity || 1),
      parent: sub.parentId,
      amount: sub.price?.price || sub.product.price,
      price: sub.price?.price || sub.product.price
    };
    return dtoItem;
  }

  calculateDiscountItems(
    items: SaleItemDto[],
    parent: SaleItemDto,
    product: Product
  ) {
    if (parent.discount) {
      let discountRemain = parent.discount - (product.discount || 0);
      const parentPrice = (product.price || 0) - (product.discount || 0);
      const totalDiscount = parent.discount - (product.discount || 0);
      let index = 0;
      for (const dtoItem of items || []) {
        if (index + 1 === items?.length) {
          dtoItem.discount = Math.round(
            (dtoItem.discount || 0) + discountRemain
          );
        } else {
          const itemPrice =
            (dtoItem.amount || 0) * (dtoItem.quantity || 1) -
            (dtoItem.discount || 0);
          const partialDiscount = (itemPrice * totalDiscount) / parentPrice;
          dtoItem.discount = Math.round(
            (dtoItem.discount || 0) + partialDiscount
          );
          discountRemain -= partialDiscount;
        }
        index++;
      }
    } else {
      for (const dtoItem of items) {
        dtoItem.discount = 0;
      }
    }
  }

  async updateSubItems(
    parent: SaleItem,
    dto: SaleItemDto,
    changedDiscount: boolean,
    current: User,
    manager: EntityManager
  ) {
    if (changedDiscount) {
      let discountRemain = dto.discount - parent.defaultDiscount;
      const parentPrice = (parent.price || 0) - (parent.defaultDiscount || 0);
      const totalDiscount = dto.discount - (parent.defaultDiscount || 0);
      let index = 0;
      for (const item of parent.items) {
        if (item.type != SaleUnitType.Product) {
          if (item.usedCredit > 0) {
            throw new BadRequestException('Unable edit package');
          }
        }
        if (index + 1 == parent.items?.length) {
          item.discount = Math.round(item.defaultDiscount + discountRemain);
        } else {
          const itemPrice =
            (item.amount || 0) * (item.quantity || 1) -
            (item.defaultDiscount || 0);
          const partialDiscount = (itemPrice * totalDiscount) / parentPrice;
          item.discount = Math.round(
            (item.defaultDiscount || 0) + partialDiscount
          );
          discountRemain -= partialDiscount;
        }
        index++;
      }
    }
    for (const item of parent.items) {
      const saleItem = dto.items?.find((i) => item.id == i.id);
      let changeContractor = false;
      if (item.contractorId != saleItem?.contractor) {
        item.contractor = { id: saleItem?.contractor } as User;
        changeContractor = true;
      }
      item.contractorIncomes = [];
      if (item.contractorId && changeContractor) {
        const ci = await this.contractorService.processContractorIncome(
          item,
          item.product,
          current,
          manager
        );
        if (ci) item.contractorIncomes.push(ci);
      }
      if (item.product?.hasPartner && changedDiscount) {
        const pcl = await this.contractorService.processPartnerIncome(
          item,
          item.product,
          current,
          manager
        );
        if (pcl?.length) {
          item.contractorIncomes = [...pcl, ...item.contractorIncomes];
        }
      }
    }
    if (
      !moment(parent.start).isSame(
        moment(dto.start, AppConstant.DATE_FORMAT),
        'date'
      )
    ) {
      for (const item of parent.items) {
        if (item.type != SaleUnitType.Product) {
          if (item.usedCredit > 0) {
            throw new BadRequestException('Unable edit package');
          }
          item.start = parent.start;
        }
      }
    }
    if (
      !moment(parent.end).isSame(
        moment(dto.end, AppConstant.DATE_FORMAT),
        'date'
      )
    ) {
      for (const item of parent.items) {
        if (item.type != SaleUnitType.Product) {
          if (item.usedCredit > 0) {
            throw new BadRequestException('Unable edit package');
          }
          item.end = parent.end;
        }
      }
    }
  }
}
