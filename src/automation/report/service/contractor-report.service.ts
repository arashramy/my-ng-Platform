import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ContractorIncome } from '../../../automation/operational/entities/ContractorIncome';
import { User } from '../../../base/entities/User';
import { ContractorIncomeReportDto } from '../dto/ContractorIncomeReportDto';
import { SaleItemService } from '../../../automation/operational/service/sale-item.service';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';

export enum ContractorReportType {
  Reception = 'reception',
  RegisteredService = 'registeredService',
  Partner = 'partner'
}

export enum detailType {
  OneSession = 'OneSession',
  RegisteredService = 'registeredService'
}

@Injectable()
export class ContractorReportService {
  constructor(private saleItemService: SaleItemService) {}

  async findByService(
    type: string,
    offset: number,
    limit: number,
    where: any,
    filters: any
  ) {
    const query = ContractorIncome.createQueryBuilder('q')
      .withDeleted()
      .leftJoinAndSelect('q.user', 'user')
      .leftJoin('q.saleItem', 'saleItem')
      .leftJoin('saleItem.product', 'product')
      .select([])
      .addSelect('SUM(q.amountAfterDiscount)', 'contractorIncomeAfterDiscount')
      .addSelect('SUM(q.amount)', 'contractorIncome')
      .addSelect('COUNT(saleItem.id)', 'total')
      .addSelect('SUM(saleItem.discount)', 'discount');
    if (type === ContractorReportType.Partner) {
      query.where('q.is_partner=true');
      query
        .addSelect('SUM(saleItem.quantity)', 'qty')
        .addSelect(
          'SUM(((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100))',
          'totalAmount'
        );
    }

    if (type === ContractorReportType.Reception) {
      query.andWhere('q.is_partner IS FALSE AND saleItem.type=:type', {
        type: SaleUnitType.Reception
      });
      query
      .addSelect(
        'SUM(CASE WHEN saleItem.benefitContractorFromPenalty THEN saleItem.quantity ELSE saleItem.quantity - saleItem.unFairPenaltyQuantity END)',
        'qty'
      )
      .addSelect(
        'SUM(CASE WHEN saleItem.benefitContractorFromPenalty THEN ((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100) ELSE ((saleItem.amount * (saleItem.quantity - saleItem.unFairPenaltyQuantity)) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * (saleItem.quantity - saleItem.unFairPenaltyQuantity)) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100) END)',
        'totalAmount'
      );
      
    }

    if (type === ContractorReportType.RegisteredService) {
      query.andWhere(
        'q.is_partner IS FALSE AND ((saleItem.type=1) OR (saleItem.type=0) OR (saleItem.type=3 AND saleItem.registered_service IS NULL)) '
      );
      query
      .addSelect(
        'SUM(CASE WHEN saleItem.benefitContractorFromPenalty THEN saleItem.quantity ELSE saleItem.quantity - saleItem.unFairPenaltyQuantity END)',
        'qty'
      )
      .addSelect(
        'SUM(CASE WHEN saleItem.benefitContractorFromPenalty THEN ((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100) ELSE ((saleItem.amount * (saleItem.quantity - saleItem.unFairPenaltyQuantity)) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * (saleItem.quantity - saleItem.unFairPenaltyQuantity)) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100) END)',
        'totalAmount'
      );
    }

    query.andWhere(
      '(q.deleted_at is null OR (q.deleted_at is not null and q.amount=0 and saleItem.deleted_at is null))'
    );
    query.andWhere(where);

    if (filters.product) {
      query.andWhere('saleItem.product =:productId', {
        productId: filters.product
      });
    }

    const total = plainToInstance(
      ContractorIncomeReportDto,
      await query.getRawOne()
    );

    if (limit) {
      query.limit(+limit || 10).offset(+offset || 0);
    }

    query
      // .addSelect('saleItem.id', 'id')
      .addSelect('product.title', 'title')
      .addGroupBy('product.title')
      .addGroupBy('saleItem.product');

    return {
      content: await query.getRawMany<any>(),
      total
    };
  }

  async findContractor(
    type: string,
    offset: number,
    limit: number,
    where: any
  ) {
    const query = ContractorIncome.createQueryBuilder('q')
      .withDeleted()
      .leftJoinAndSelect('q.user', 'user')
      .leftJoin('q.saleItem', 'saleItem')
      .leftJoin('saleItem.product', 'product')
      .select([])
      .addSelect('SUM(q.amountAfterDiscount)', 'contractorIncomeAfterDiscount')
      .addSelect('SUM(q.amount)', 'contractorIncome')
      .addSelect('SUM(saleItem.discount)', 'discount');

    if (type === ContractorReportType.Partner) {
      query.where('q.is_partner=true');
      query
        .addSelect('SUM(saleItem.quantity)', 'qty')
        .addSelect(
          'SUM(((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100))',
          'totalAmount'
        );
    }

    if (type === ContractorReportType.Reception) {
      query.andWhere('q.is_partner IS FALSE AND saleItem.type=:type', {
        type: SaleUnitType.Reception
      });
      query
        .addSelect(
          'SUM(CASE WHEN saleItem.benefitContractorFromPenalty THEN saleItem.quantity ELSE saleItem.quantity - saleItem.unFairPenaltyQuantity END)',
          'qty'
        )
        .addSelect(
          'SUM(CASE WHEN saleItem.benefitContractorFromPenalty THEN ((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100) ELSE ((saleItem.amount * (saleItem.quantity - saleItem.unFairPenaltyQuantity)) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * (saleItem.quantity - saleItem.unFairPenaltyQuantity)) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100) END)',
          'totalAmount'
        );
    }

    if (type === ContractorReportType.RegisteredService) {
      query.andWhere(
        'q.is_partner IS FALSE AND ((saleItem.type=1) OR (saleItem.type=0) OR (saleItem.type=3 AND saleItem.registered_service IS NULL)) '
      );

      query
      .addSelect(
        'SUM(CASE WHEN saleItem.benefitContractorFromPenalty THEN saleItem.quantity ELSE saleItem.quantity - saleItem.unFairPenaltyQuantity END)',
        'qty'
      )
      .addSelect(
        'SUM(CASE WHEN saleItem.benefitContractorFromPenalty THEN ((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100) ELSE ((saleItem.amount * (saleItem.quantity - saleItem.unFairPenaltyQuantity)) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * (saleItem.quantity - saleItem.unFairPenaltyQuantity)) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100) END)',
        'totalAmount'
      );
    }

    query.andWhere(
      '(q.deleted_at is null OR (q.deleted_at is not null and q.amount=0 and saleItem.deleted_at is null))'
    );
    query.andWhere(where);
    const queryCount = await query.getRawOne();

    query
      .addSelect('user.id', 'id')
      .addSelect('user.code', 'code')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .groupBy('user.id')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .addGroupBy('user.mobile');

    const total = (await query.getRawMany()).length;

    if (limit) {
      query.limit(limit || 10).offset(offset || 0);
    }

    return {
      content: await query.getRawMany<any>(),
      total: { ...queryCount, total: total }
    };
  }

  // +

  async details(
    type: string,
    offset: number,
    limit: number,
    where: any,
    filters: any
  ) {
    const query = ContractorIncome.createQueryBuilder('q')
      .withDeleted()
      .leftJoinAndSelect('q.saleItem', 'saleItem')
      .leftJoinAndSelect('saleItem.user', 'member')
      .leftJoin('saleItem.saleOrder', 'saleOrder')
      .leftJoinAndSelect('q.user', 'user')
      .leftJoin('saleItem.product', 'product');

    if (type === ContractorReportType.Partner) {
      query.where('q.is_partner=true');
    }

    if (type === ContractorReportType.Reception) {
      query.andWhere('q.is_partner IS FALSE AND saleItem.type=:type', {
        type: SaleUnitType.Reception
      });
      if (filters['detailType.equals'] === detailType.OneSession) {
        query.andWhere('saleItem.registeredService is null');
      } else if (
        filters['detailType.equals'] === detailType.RegisteredService
      ) {
        query.andWhere('saleItem.registeredService is not null');
      }
    }

    if (type === ContractorReportType.RegisteredService) {
      query.andWhere(
        'q.is_partner IS FALSE AND ((saleItem.type=1) OR (saleItem.type=0) OR  (saleItem.type=3 AND saleItem.registered_service IS NULL)) '
      );
      if (filters['detailType.equals'] === detailType.OneSession) {
        query.andWhere('saleOrder.reception=true');
      } else if (
        filters['detailType.equals'] === detailType.RegisteredService
      ) {
        query.andWhere('saleOrder.reception=false');
      }
    }
    query.andWhere(
      '(q.deleted_at is null OR (q.deleted_at is not null and q.amount=0 and saleItem.deleted_at is null))'
    );
    query.andWhere(where);

    console.log('filters', filters);

    if (filters?.user) {
      query.andWhere('member.id=:filterByUser', {
        filterByUser: filters?.user
      });
    }

    if (filters.product) {
      query.andWhere('saleItem.product =:productId', {
        productId: filters.product
      });
    }

    console.log('detailType.equals', filters['detailType.equals'], limit);

    if (limit) {
      console.log('called');
      query.take(+limit || 10).skip(+offset || 0);
    }

    const content = await query.getMany();

    if (type === ContractorReportType.Reception || type === ContractorReportType.RegisteredService) {
      query
        .addSelect(
          'SUM(CASE WHEN saleItem.benefitContractorFromPenalty THEN saleItem.quantity ELSE saleItem.quantity - saleItem.unFairPenaltyQuantity END)',
          'qty'
        )
        .addSelect(
          'SUM(CASE WHEN saleItem.benefitContractorFromPenalty THEN ((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100) ELSE ((saleItem.amount * (saleItem.quantity - saleItem.unFairPenaltyQuantity)) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * (saleItem.quantity - saleItem.unFairPenaltyQuantity)) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100) END)',
          'totalAmount'
        );
    } else {
      query
        .addSelect(
          'SUM(((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100))',
          'totalAmount'
        )
        .addSelect('SUM(saleItem.quantity)', 'qty');
    }

    query
      .select([])
      .addSelect('SUM(q.amountAfterDiscount)', 'contractorIncomeAfterDiscount')
      .addSelect('SUM(q.amount)', 'contractorIncome')

      .addSelect('COUNT(saleItem.id)', 'total')
      .addSelect('SUM(saleItem.discount)', 'discount');

    return {
      content,
      total: plainToInstance(ContractorIncomeReportDto, await query.getRawOne())
    };
  }

  async findSaleItem(
    type: string,
    offset: number,
    limit: number,
    where: any,
    filters: any,
    current: any
  ) {
    const query = ContractorIncome.createQueryBuilder('q')
      .withDeleted()
      .leftJoin('q.user', 'user')
      .leftJoinAndSelect('q.saleItem', 'saleItem')
      .leftJoin(User, 'member', 'member.id=saleItem.user')
      .leftJoin('saleItem.product', 'product');

    if (type === ContractorReportType.Partner) {
      query.where('q.is_partner=true');
    }

    if (type === ContractorReportType.Reception) {
      query.andWhere('q.is_partner IS FALSE AND saleItem.type=:type', {
        type: SaleUnitType.Reception
      });

    }

    if (type === ContractorReportType.RegisteredService) {
      query.andWhere(
        'q.is_partner IS FALSE AND ((saleItem.type=1) OR (saleItem.type=0) OR (saleItem.type=3 AND saleItem.registered_service IS NULL)) '
      );
    }
    query.andWhere(where);
    query.andWhere(
      '(q.deleted_at is null OR (q.deleted_at is not null and q.amount=0 and saleItem.deleted_at is null))'
    );

    const result = await query.getMany();
    const saleItems = result.map((e) => e.saleItem.id);

    if (saleItems.length === 0) {
      throw new BadRequestException('');
    }

    let params: any =
      saleItems.length > 1
        ? { ids: saleItems.join(',') }
        : { id: saleItems[0] };

    params = { ...params, user: filters.user };

    const [content, total] = await this.saleItemService.findAll(
      params,
      current
    );
    return { content, total };
  }

  async findByUser(
    type: string,
    offset: number,
    limit: number,
    where: any,
    filters: any
  ) {
    const query = ContractorIncome.createQueryBuilder('q')
      .withDeleted()
      .select([])

      .addSelect('SUM(q.amountAfterDiscount)', 'contractorIncomeAfterDiscount')
      .addSelect('SUM(q.amount)', 'contractorIncome')
      // .addSelect(
      //   'SUM(((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100))',
      //   'totalAmount'
      // )
      // .addSelect('SUM(saleItem.quantity)', 'qty')
      .addSelect('SUM(saleItem.discount)', 'discount')

      .leftJoin('q.user', 'user')
      .leftJoin('q.saleItem', 'saleItem')
      .leftJoin(User, 'member', 'member.id=saleItem.user')
      .leftJoin('saleItem.product', 'product');

    if (type === ContractorReportType.Partner) {
      query.where('q.is_partner=true');
      query
      .addSelect('SUM(saleItem.quantity)', 'qty')
      .addSelect(
        'SUM(((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100))',
        'totalAmount'
      );
    }

    if (type === ContractorReportType.Reception) {
      query.andWhere('q.is_partner IS FALSE AND saleItem.type=:type', {
        type: SaleUnitType.Reception
      });

      query
        .addSelect(
          'SUM(CASE WHEN saleItem.benefitContractorFromPenalty THEN saleItem.quantity ELSE saleItem.quantity - saleItem.unFairPenaltyQuantity END)',
          'qty'
        )
        .addSelect(
          'SUM(CASE WHEN saleItem.benefitContractorFromPenalty THEN ((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100) ELSE ((saleItem.amount * (saleItem.quantity - saleItem.unFairPenaltyQuantity)) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * (saleItem.quantity - saleItem.unFairPenaltyQuantity)) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100) END)',
          'totalAmount'
        );
    }

    if (type === ContractorReportType.RegisteredService) {
      query.andWhere(
        'q.is_partner IS FALSE AND ((saleItem.type=1) OR (saleItem.type=0) OR (saleItem.type=3 AND saleItem.registered_service IS NULL)) '
      );
      query
        .addSelect(
          'SUM(CASE WHEN saleItem.benefitContractorFromPenalty THEN saleItem.quantity ELSE saleItem.quantity - saleItem.unFairPenaltyQuantity END)',
          'qty'
        )
        .addSelect(
          'SUM(CASE WHEN saleItem.benefitContractorFromPenalty THEN ((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * saleItem.quantity) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100) ELSE ((saleItem.amount * (saleItem.quantity - saleItem.unFairPenaltyQuantity)) - (saleItem.discount + saleItem.returnCredit))+((saleItem.amount * (saleItem.quantity - saleItem.unFairPenaltyQuantity)) - (saleItem.discount + saleItem.returnCredit)) * ((saleItem.tax) / 100) END)',
          'totalAmount'
        );
    }

    if (filters?.user) {
      query.andWhere('member.id=:filterByUser', {
        filterByUser: filters?.user
      });
    }

    console.log('where', where);

    query.andWhere(where);
    query.andWhere(
      '(q.deleted_at is null OR (q.deleted_at is not null and q.amount=0 and saleItem.deleted_at is null))'
    );
    const queryCount = await query
      .addSelect('COUNT(distinct(saleItem.user))', 'total')
      .getRawOne();

    query
      .addSelect('member.id', 'user')
      .addSelect('member.code', 'code')
      .addSelect('member.firstName', 'firstName')
      .addSelect('member.lastName', 'lastName')
      .groupBy('member.id')
      .addGroupBy('member.firstName')
      .addGroupBy('member.lastName')
      .addGroupBy('member.mobile');

    if (limit) {
      console.log('called limit');
      query.limit(limit || 10).offset(offset || 0);
    }

    return {
      content: (await query.getRawMany<any>()).map((obj) =>
        plainToInstance(ContractorIncomeReportDto, obj)
      ),
      total: plainToInstance(ContractorIncomeReportDto, queryCount)
    };
  }
}
