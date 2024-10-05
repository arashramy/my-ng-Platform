import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SaleItem } from '../entities/SaleItem';
import { User } from '../../../base/entities/User';
import { ProductService } from '../../base/service/product.service';
import { SaleItemDto } from '../dto/sale-order.dto';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { ContractorService } from '../../base/service/contractor.service';
import { Product } from '../../base/entities/Product';
import { ProductCategory } from '../../base/entities/ProductCategory';
import { ProductSchedule } from '../../base/entities/ProductSchedule';
import { ContractorIncome } from 'src/automation/operational/entities/ContractorIncome';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';


@Injectable()
export class ProductItemService {
  constructor(
    private productService: ProductService,
    private contractorService: ContractorService
  ) {}

  async upsert(
    dto: SaleItemDto,
    item: SaleItem,
    product: Product,
    saleUnit: SaleUnit,
    current: User,
    entityManager: EntityManager
  ) {
    let productSchedule: ProductSchedule;
    if (
      !dto.isArchived &&
      product.hasSchedules &&
      !dto.parent &&
      !item?.parent
    ) {
      if (product.schedules?.length) {
        productSchedule = product.findScheduleInTime(dto.submitAt);
        if (!productSchedule) {
          throw new BadRequestException('Not available product in time');
        }
      } else {
        productSchedule = await this.productService.findScheduleInTime(
          product.id,
          saleUnit.organizationUnitId,
          dto.submitAt
        );
        if (!productSchedule) {
          throw new BadRequestException('Not available product in time');
        }
      }
    }

    let out = item;
    if (out) {
      out.quantity = dto.quantity || 0;
      if (out.quantity != out.quantity) {
        out.price = await this.productPrice(
          dto,
          item,
          product,
          productSchedule,
          entityManager
        );
      }
      out.updatedBy = current;
    } else {
      out = new SaleItem();
      out.product = product;
      out.isOnline = dto.isOnline;
      out.type = SaleUnitType.Product;
      out.title = product.title;
      out.archived = dto.isArchived;
      out.saleUnit = saleUnit;
      out.category = { id: product.categoryId } as ProductCategory;
      out.manualPrice = false;
      out.quantity = dto.quantity || 0;
      out.tax = product.tax || 0;
      out.persons = 0;
      out.persons = 0;
      out.description = dto.description;
      out.isPaymentContractor = dto.isPaymentContractor;

      if (dto.eventSelectedPriceId) {
        out.eventSelectedPriceId = dto.eventSelectedPriceId;
      }

      if (dto.isArchived || dto.parent) {
        out.price = dto.price;
      } else {
        out.tax = dto.tax;
        out.price =
          dto.isReserve || dto.eventSelectedPriceId
            ? dto.price
            : await this.productPrice(
                dto,
                item,
                product,
                productSchedule,
                entityManager
              );
      }
      out.createdBy = current;
      out.withGuest = product.withGuest;
      out.usedCredit = 0;
      out.submitAt = dto.submitAt;
      out.defaultDiscount = product.discount || 0;
    }
    if (dto.unFairPenaltyQuantity) {
      out.unFairPenaltyQuantity = dto.unFairPenaltyQuantity;
    }

    out.deliveredItems = dto.deliveredItems;
    out.totalDelivered = dto.deliveredItems?.reduce((pre, currentValue) => {
      pre += currentValue.count;
      return pre;
    }, 0);
    out.description = dto.description;
    console.log('------------------price--------------------------');
    console.log(out.amount);
    console.log(out.price);
    if (dto.manualPrice && product.manualPrice && dto.amount) {
      out.amount = dto.amount;
    } else {
      out.amount = out.price;
    }

    if (saleUnit?.allowDiscount || dto.parent) out.discount = dto.discount || 0;
    else out.discount = product.discount || 0;
    // if (out.discount > out.totalAmount) {
    //   throw new BadRequestException('Invalid discount amount');
    // }
    if (out.totalAmount < 0) {
      throw new BadRequestException('Amount is zero');
    }
    if (product.hasPartner) {
      out.contractorIncomes = await this.contractorService.processPartnerIncome(
        out,
        product,
        current,
        entityManager
      );
    }
    out.contractorIncomes = [];
    if (!product.unlimited) {
      if (product.hasContractor) {
        if (!dto.isArchived) {
          if (!dto.contractor) {
            throw new BadRequestException('Contractor not found');
          }
          if (
            !(await this.contractorService.checkPresenceOfContractorInOrganizationUnit(
              dto.contractor,
              out.organizationUnitId || out.organizationUnit?.id,
              out.submitAt,
              entityManager
            ))
          ) {
            throw new BadRequestException(
              'Contractor not available in this time'
            );
          }
        }

        out.contractor = { id: dto.contractor } as User;
        if (
          out.contractor.id &&
          (!dto.isArchived ||
            dto.returnBackContractorIncomeType ||
            (dto.isArchived && dto.isPaymentContractor))
        ) {
          const isEdit =
            await this.contractorService.checkIsEditContractorIncomes(
              item,
              dto,
              current,
              entityManager
            );
          console.log('isEdit174', isEdit);
          let ci = await this.contractorService.processContractorIncome(
            out,
            product,
            current,
            entityManager,
            isEdit
          );

          if (ci) out.contractorIncomes.push(ci);
        }
      }
      if (product.hasPartner) {
        let pcl = await this.contractorService.processPartnerIncome(
          out,
          product,
          current,
          entityManager
        );
        if (pcl?.length) {
          out.contractorIncomes = [...pcl, ...out.contractorIncomes];
        }
      }
    }
    // console.log('product Item', out);
    return out;
  }

  async productPrice(
    dto: SaleItemDto,
    item: SaleItem,
    product: Product,
    productSchedule: ProductSchedule,
    entityManager: EntityManager
  ) {
    let finalPrice = 0;
    if (product.hasPriceList) {
      let price;
      if (product.priceList?.length) {
        price = product?.priceList?.find(
          (p) => p.min <= dto.quantity && dto.quantity < p.max
        )?.price;
      } else {
        price = await this.productService.getProductPriceQuantityBased(
          dto.id,
          dto.quantity,
          entityManager
        );
      }
      if (price) {
        finalPrice = price;
      }
    } else if (productSchedule && productSchedule.price) {
      finalPrice = productSchedule.price;
    }
    if (!finalPrice) {
      finalPrice = product.price;
    }
    return finalPrice;
  }
}
