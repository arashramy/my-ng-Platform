import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SaleItemDto } from '../dto/sale-order.dto';
import { User } from '../../../base/entities/User';
import { ProductService } from '../../base/service/product.service';
import { ContractorService } from '../../base/service/contractor.service';
import { SaleItem,SaleUnitType } from '../entities/SaleItem';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { Product } from '../../base/entities/Product';
import { OrganizationUnit } from '../../../base/entities/OrganizationUnit';
import { ProductSchedule } from '../../base/entities/ProductSchedule';
import { ProductCategory } from '../../base/entities/ProductCategory';
import { ContractorIncome } from '../entities/ContractorIncome';

@Injectable()
export class ServiceItemService {
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
    manager: EntityManager
  ) {
    if (product.isLocker) {
      throw new BadRequestException('Service is locker');
    }
    let productSchedule: ProductSchedule;
    if (!dto.isArchived && product.hasSchedules) {
      if (product.schedules?.length) {
        productSchedule = product.findScheduleInTime(dto.submitAt);
        if (!productSchedule) {
          throw new BadRequestException('Not available service in time');
        }
      } else {
        productSchedule = await this.productService.findScheduleInTime(
          product.id,
          saleUnit.organizationUnitId,
          dto.submitAt
        );
        if (!productSchedule) {
          throw new BadRequestException('Not available service in time');
        }
      }
    }

    let out: SaleItem = item;
    if (!item) {
      out = new SaleItem();
      out.quantity = 0;
      out.product = product;
      out.type = SaleUnitType.Reception;
      out.title = product.title;
      out.archived = dto.isArchived;
      out.saleUnit = saleUnit;
      out.category = { id: product.categoryId } as ProductCategory;
      out.organizationUnit = {
        id: saleUnit.organizationUnitId
      } as OrganizationUnit;
      out.manualPrice = dto.manualPrice;
      out.createdBy = current;
      out.tax = product.tax;
      out.related = product.related;
      out.defaultDiscount = product.discount || 0;
      out.isPaymentContractor = dto.isPaymentContractor;
      out.isOnline = dto.isOnline;
      out.benefitContractorFromPenalty =
        dto.unFairPenaltyQuantity > 0 &&
        product.unfairUseAmount > 0 &&
        product.fairUseTime > 0
          ? product.benefitContractorFromPenalty
          : true;

      if (dto.registeredService) {
        try {
          out.registeredService = await manager.findOneOrFail(SaleItem, {
            where: {
              id: dto.registeredService,
              user: { id: dto.user }
            }
          });
          out.product = product;
          out.related = out.registeredService.related;
        } catch (e) {
          throw new BadRequestException('Service not found');
        }
        if (out.registeredService) {
          if (out.registeredService.contractorId && !dto.contractor)
            dto.contractor = out.registeredService.contractorId;

          dto.price = 0;
        }
      } else {
        if (!product) {
          throw new BadRequestException('Service not found');
        }
        if (product?.hasSchedules) {
          if (productSchedule) {
            out.price = productSchedule.price;
            out.amount = productSchedule.price;
          } else {
            throw new BadRequestException('Not available service in time');
          }
        }  else if (product?.hasPriceList) {
        let pricePolicy
        console.log('price list length',product.priceList?.length)
        console.log(dto.priceId)
        if (product.priceList?.length) {
          if (dto.priceId) {
            pricePolicy = product.priceList?.find((p) => p.id == dto.priceId);
            console.log(111,pricePolicy)
          }
        } else {
          if (dto.priceId) {
            pricePolicy = await this.productService.findPriceById(
              product.id,
              dto.priceId,
              manager
            );
            console.log(222,pricePolicy)

          }
        }
        out.priceId = pricePolicy.id;
        out.amount = pricePolicy.price;

      }else {
          out.price = product.price;
          out.amount = out.price;
        }
      }
    } else {
      out.updatedBy = current;
      item.benefitContractorFromPenalty =
        dto.unFairPenaltyQuantity > 0 &&
        product.unfairUseAmount > 0 &&
        product.fairUseTime > 0
          ? out.registeredService
            ? product.benefitContractorFromPenalty
            : false
          : true;
    }

    console.log(
      'unFairPenaltyQuantity---------------------',
      dto.unFairPenaltyQuantity
    );

    if (dto.unFairPenaltyQuantity) {
      out.unFairPenaltyQuantity = dto.unFairPenaltyQuantity;
    }

    if (!out.registeredService || product.withGuest)
      out.persons = dto.persons || 1;
    else out.persons = 1;
    if (dto.quantity != out.quantity) {
      const quantity = dto.quantity - out.quantity;
      if (quantity != 0 && out.registeredService) {
        out.registeredService.tryUseCredit(quantity);
        out.remainCredit =
        (+out.registeredService.credit || 0) -
        (+out.registeredService.usedCredit || 0);
        out.registeredServiceChangeCredit = quantity;
        if (+out.remainCredit == 0 && out.registeredService?.groupClassRoomId) {
          out.registeredService.groupClassRoomIncrement = -1;
        }
      }
      out.quantity = dto.quantity;
    }
    if (!out.registeredService) {
      if (saleUnit.allowDiscount) out.discount = dto.discount || 0;
      else out.discount = product.discount || 0;
      if (out.totalAmount < 0) {
        throw new BadRequestException('Invalid discount amount');
      }
      out.description = dto.description;
    } else {
      out.discount = 0;
      out.description = dto.description || out.registeredService?.description;
    }
    const preContractorIncomes = out?.contractorIncomes;
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
              manager
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
          if (
            !dto.unFairPenaltyQuantity ||
            dto.unFairPenaltyQuantity === 0 ||
            product.unfairUseAmount === 0 ||
            (dto.unFairPenaltyQuantity > 0 &&
              product.benefitContractorFromPenalty &&
              out.registeredService)
          ) {
            console.log('called201');
            const isEdit =
              await this.contractorService.checkIsEditContractorIncomes(
                item,
                dto,
                current,
                manager
              );
            console.log('isEdit175', isEdit);

            let ci = await this.contractorService.processContractorIncome(
              out,
              product,
              current,
              manager,
              isEdit
            );
            if (ci) out.contractorIncomes.push(ci);
          } else {
            console.log(preContractorIncomes);
            out.contractorIncomes = preContractorIncomes;
          }
        }
      }
      if (product.hasPartner) {
        let pcl = await this.contractorService.processPartnerIncome(
          out,
          product,
          current,
          manager
        );
        if (pcl?.length) {
          out.contractorIncomes = [...pcl, ...out.contractorIncomes];
        }
      }
    }

    if (out.groupClassRoomId) {
    }
    return out;
  }
}
