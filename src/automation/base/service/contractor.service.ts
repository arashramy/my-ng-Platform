import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  LessThanOrEqual,
  MoreThanOrEqual
} from 'typeorm';
import moment from 'moment';
import { Role, User } from '../../../base/entities/User';
import { ProductContractor } from '../entities/ProductContractor';
import { SaleItem } from '../../operational/entities/SaleItem';
import { ContractorIncome } from '../../operational/entities/ContractorIncome';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';
import { Product } from '../entities/Product';
import { ProductPartner } from '../entities/ProductPartner';

@Injectable()
export class ContractorService {
  CONTRACTOR_SCHEDULE_START_LIMIT = 15;
  CONTRACTOR_SCHEDULE_END_LIMIT = 15;

  constructor(private datasource: DataSource) {}

  async findById(id: number, manager?: EntityManager) {
    manager = manager || this.datasource.manager;
    return manager
      ?.createQueryBuilder()
      .from(User, 'u')
      .where({ id: id })
      .andWhere(`q.user_roles::jsonb ? '${Role.Contactor}'`)
      .cache(true)
      .getOne();
  }

  async getProductContractor(
    product: number,
    contractor: number,
    manager?: EntityManager
  ) {
    manager ||= this.datasource.manager;
    return manager.findOne(ProductContractor, {
      where: {
        product: { id: product },
        contractor: { id: contractor }
      },
      cache: true,
      relations: { contractor: true }
    });
  }

  async getProductContractors(product: number, manager?: EntityManager) {
    manager ||= this.datasource.manager;
    return manager.find(ProductContractor, {
      where: {
        product: { id: product }
      },
      cache: true
    });
  }

  async getProductPartners(product: number, manager?: EntityManager) {
    manager ||= this.datasource.manager;
    return manager.find(ProductPartner, {
      where: {
        product: { id: product }
      },
      cache: true
    });
  }

  async processContractorIncome(
    saleItem: SaleItem,
    product: Product,
    current: User,
    manager?: EntityManager,
    isEdit: boolean = false
  ) {
   
    manager ||= this.datasource.manager;

    if (product.hasContractor) {
      let contractorIncome: ContractorIncome;
      if (saleItem?.id && !isEdit) {
        contractorIncome = await manager.findOne(ContractorIncome, {
          where: {
            saleItem: { id: saleItem.id },
            isPartner: false
          }
        });
      } else {
        if (
          saleItem.type == SaleUnitType.Service ||
          saleItem.type == SaleUnitType.Product ||
          saleItem.type == SaleUnitType.Reception
        ) {
          let pc = await this.getProductContractor(
            product.id,
            saleItem?.contractor?.id || saleItem.contractorId,
            manager
          );
          if (pc) {
            contractorIncome = new ContractorIncome();
            contractorIncome.user = { id: pc.contractorId } as User;
            contractorIncome.fixedAmount = pc.amount;
            contractorIncome.percent = pc.percent;
            contractorIncome.isPartner = false;
            contractorIncome.createdBy = current;
          }
        }
      }

      if (contractorIncome) {
        if (saleItem.registeredService || saleItem.registeredServiceId) {
          //reception
          contractorIncome.amount = Math.round(
            ((saleItem.registeredService.price * contractorIncome.percent) /
              100 +
              contractorIncome.fixedAmount) *
              saleItem.quantity
          );
          contractorIncome.amountAfterDiscount = Math.round(
            (((saleItem.registeredService.finalAmountWithoutTax /
              saleItem.registeredService.credit) *
              contractorIncome.percent) /
              100 +
              contractorIncome.fixedAmount) *
              saleItem.quantity
          );
        } else {
          //reg
          contractorIncome.amount = Math.round(
            (saleItem.finalAmountWithoutDiscountAndTax *
              contractorIncome.percent) /
              100 +
              saleItem.quantity *
                (saleItem.credit || 1) *
                contractorIncome.fixedAmount
          );
          contractorIncome.amountAfterDiscount = Math.round(
            (saleItem.finalAmountWithoutTax * contractorIncome.percent) / 100 +
              saleItem.quantity *
                (saleItem.credit || 1) *
                contractorIncome.fixedAmount
          );
        }

        if (contractorIncome.id) {
          contractorIncome.createdAt = new Date();
          contractorIncome.createdBy = current;
        } else {
          contractorIncome.updatedAt = new Date();
          contractorIncome.updatedBy = current;
        }
        if (
          contractorIncome.amount == 0 ||
          (!saleItem.contractor && !saleItem.contractorId)
        ) {
          contractorIncome.deletedAt = new Date();
          contractorIncome.deletedBy = current;
        }
      }
      return contractorIncome;
    }
  }

  async processPartnerIncome(
    saleItem: SaleItem,
    product: Product,
    current: User,
    manager?: EntityManager
  ) {
    manager ||= this.datasource.manager;
    if (product.hasPartner) {
      let contractorIncomes: ContractorIncome[];
      if (saleItem?.id) {
        contractorIncomes = await manager.find(ContractorIncome, {
          where: { saleItem: { id: saleItem.id }, isPartner: true }
        });
      } else {
        contractorIncomes = [];
        let contractors;
        if (product.partners?.length) {
          contractors = product.partners;
        } else {
          contractors = await this.getProductPartners(product.id, manager);
        }
        contractorIncomes = contractors.map((pc) => {
          let ci = new ContractorIncome();
          ci.user = { id: pc.userId } as User;
          ci.fixedAmount = pc.amount;
          ci.percent = pc.percent;
          ci.isPartner = true;
          ci.createdBy = current;
          return ci;
        });
      }
      const out = [];
      for (let ci of contractorIncomes) {
        ci.amount = Math.round(
          (saleItem.finalAmountWithoutDiscountAndTax * ci.percent) / 100 +
            saleItem.quantity * ci.fixedAmount
        );
        ci.amountAfterDiscount = Math.round(
          (saleItem.finalAmountWithoutTax * ci.percent) / 100 +
            saleItem.quantity * ci.fixedAmount
        );
        if (ci.id) {
          ci.createdAt = new Date();
          ci.createdBy = current;
        } else {
          ci.updatedAt = new Date();
          ci.updatedBy = current;
        }
        if (ci.amount == 0) {
          ci.deletedAt = new Date();
          ci.deletedBy = current;
        }
        out.push(ci);
      }
      return out;
    }
  }

  async checkPresenceOfContractorInOrganizationUnit(
    contractorId: number,
    orgUnit: number,
    submitAt: Date,
    manager?: EntityManager
  ) {
    manager ||= this.datasource.manager;
    let current = (submitAt ? moment(submitAt) : moment()).utc();
    let day = current.isoWeekday();
    return manager
      .createQueryBuilder()
      .from(User, 'u')
      .leftJoin('u.schedules', 'q')
      .where(
        `u.id = :id AND (q.id IS NULL OR (q.org_unit = :orgUnit AND q.from <= :start AND q.to > :end AND q.days::jsonb @> '${day}'))`,
        {
          id: contractorId,
          start: current.utc(true).format('HH:mm:ss'),
          end: current.utc(true).format('HH:mm:ss'),
          orgUnit: orgUnit
        }
      )
      .getExists();
  }

  async checkIsEditContractorIncomes(
    item: SaleItem,
    dto: any,
    current: User,
    manager: EntityManager
  ) {
    const isEdit =
      item?.id && dto.contractor && dto.contractor != item?.contractorId;
    console.log('checkIsEditContractorIncomes')
    if (!isEdit) return false;
    const last = await manager.findOne(ContractorIncome, {
      where: {
        saleItem: { id: item.id },
        user: { id: item.contractorId }
      },
      withDeleted: true,
      relations: { saleItem: true, user: true }
    });
    if (last && last.user.id !== dto.contractor) {
      last.deletedAt = new Date();
      last.deletedBy = current;
      last.amount = 1;
      await last.save();
    }

    return isEdit;
  }
}
