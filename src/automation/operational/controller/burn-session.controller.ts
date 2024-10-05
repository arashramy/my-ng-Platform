import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { RegisteredServiceStatus, SaleItem } from '../entities/SaleItem';
import moment from 'moment';
import { burnSessionDto } from '../dto/burnSessionDto';
import { DataSource, LessThan } from 'typeorm';
import { AppConstant } from '../../../common/constant/app.constant';
import { SaleOrderService } from '../service/sale-order.service';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { ReceptionService } from '../service/reception.service';
import { AccessTokenGuard } from '../../../auth/guard/access-token.guard';
import { ContractorService } from '../../../automation/base/service/contractor.service';
import { ContractorIncome } from '../entities/ContractorIncome';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';

@Controller('/api/burn/session')
@UseGuards(AccessTokenGuard)
export class BurnSessionController {
  constructor(
    private saleOrderService: SaleOrderService,
    private receptionService: ReceptionService,
    private datasource: DataSource,
    private contractorService: ContractorService
  ) {}

  @Get('/page')
  async getArchivedRegisteredService(
    @Query() params: any,
    @CurrentUser() current: any
  ) {
    let saleUnits = {};

    if (!params.saleUnit) {
      throw new BadRequestException('saleUnit is required');
    }
    const saleUnit = await SaleUnit.findOne({
      where: { id: +params.saleUnit }
    });

    if (!saleUnit) {
      throw new BadRequestException('invalid saleUnit');
    }
    const query = SaleItem.createQueryBuilder('q').where('q.type in (1)');

    query
      .leftJoinAndSelect('q.contractor', 'contractor')
      .leftJoinAndSelect('q.product', 'product')
      .leftJoinAndSelect('q.saleOrder', 'saleOrder')
      .leftJoinAndSelect('q.saleUnit', 'saleUnit')
      .leftJoinAndSelect('q.user', 'user');

    if (params.saleUnit) {
      if (
        !(
          current?.isAdmin() ||
          current?.accessShops?.some((s) => s.id == +params.saleUnit)
        )
      ) {
        throw new BadRequestException('Access denied');
      }

      saleUnits = (
        await SaleUnit.createQueryBuilder('s')
          .select(['id'])
          .where([
            { id: params.saleUnit },
            { reception: params.saleUnit, allowSettle: false }
          ])
          .cache(true)
          .getRawMany()
      ).map((a) => a.id);
    }

    if (params.saleUnit) {
      query.andWhere(`saleUnit.id in (${saleUnits})`);
    } else if (!current?.isAdmin()) {
      query.andWhere(
        `saleUnit.id in (${current?.accessShops?.map((s) => s.id)})`
      );
    }

    if (params['end.lte'] && params['end.gte']) {
      query.andWhere('q.end  BETWEEN :startDate AND :endDate', {
        startDate: params['end.gte'],
        endDate: moment(params['end.lte']).startOf('day').add(1, 'day')
      });
    } else if (params['end.lte']) {
      query.andWhere('q.end <= :startDate', {
        startDate: moment(params['end.lte']).startOf('day').add(1, 'day')
      });
    } else if (params['end.gte']) {
      query.andWhere('q.end >= :endDate', { endDate: params['end.gte'] });
    }

    if (params['submitAt.lte'] && params['submitAt.gte']) {
      query.andWhere(
        'q.submitAt  BETWEEN :submitAtStartDate AND :submitAtEndDate',
        {
          submitAtStartDate: params['submitAt.gte'],
          submitAtEndDate: moment(params['submitAt.lte'])
            .startOf('day')
            .add(1, 'day')
        }
      );
    } else if (params['submitAt.lte']) {
      query.andWhere('q.submitAt <= :submitAtStartDate', {
        submitAtStartDate: moment(params['submitAt.lte'])
          .startOf('day')
          .add(1, 'day')
      });
    } else if (params['submitAt.gte']) {
      query.andWhere('q.submitAt >= : submitAtEndDate', {
        submitAtEndDate: moment(params['submitAt.gte'])
      });
    }

    if (params['start.lte'] && params['start.gte']) {
      query.andWhere('q.start  BETWEEN :startStartDate AND :startEndDate', {
        startStartDate: params['start.gte'],
        startEndDate: moment(params['start.lte']).startOf('day').add(1, 'day')
      });
    } else if (params['start.lte']) {
      query.andWhere('q.start <= :startStartDate', {
        startStartDate: moment(params['start.lte']).startOf('day').add(1, 'day')
      });
    } else if (params['start.gte']) {
      query.andWhere('q.start >= :startEndDate', {
        startEndDate: moment(params['start.gte'])
      });
    }

    query.andWhere('q.credit - q.usedCredit >0');

    query.andWhere('q.status= :archivedStatus', {
      archivedStatus: RegisteredServiceStatus.archived
    });

    if (params['contractor.equals']) {
      query.andWhere('q.contractor = :contractor', {
        contractor: params['contractor.equals']
      });
    }
    if (params['user.equals']) {
      query.andWhere('q.user = :user', {
        user: params['user.equals']
      });
    }

    if (params['product.equals']) {
      query.andWhere('q.product = :product', {
        product: params['product.equals']
      });
    }

    if (params.type) {
      query.andWhere('q.type = :type', {
        type: params.type
      });
    }

    if (params.sortField && params.sortOrder) {
      query
        .orderBy()
        .addOrderBy(
          'q.' + params.sortField,
          +params.sortOrder === 1 ? 'ASC' : 'DESC'
        );
    }

    const result = await query
      .skip(+params.offset || 0)
      .take(+params.limit || 10)
      .getManyAndCount();

    return {
      content: result[0],
      total: result[1]
    };
  }

  @Post('/')
  async burnSessionRegisteredService(
    @Body() data: { items: burnSessionDto[]; saleUnit: number; submitAt: any },
    @CurrentUser() user: any
  ) {
    let allOrder = [];
    let allErrors = [];
    let response;
    const saleUnit = await SaleUnit.findOne({ where: { id: data.saleUnit } });
    console.log(data);
    if (!saleUnit) throw new BadRequestException('invalid saleUnit');
    for (let index = 0; index < data.items.length; index++) {
      response = await this.datasource.manager.transaction(async (manager) => {
        const el = data.items[index];
        let order;
        let orders = [];
        let errors = [];
        const registered_service = await SaleItem.findOne({
          where: {
            id: el.id,
            end: LessThan(moment(moment(), AppConstant.DATE_FORMAT) as any),
            status: RegisteredServiceStatus.archived
          },
          relations: ['saleOrder', 'user', 'product']
        });

        if (!registered_service) {
          throw new BadRequestException('not found');
        }

        registered_service.isPaymentContractor = !!el.isPaymentCont;
        await registered_service.save();

        if (
          registered_service?.credit - registered_service?.usedCredit === 0 ||
          registered_service.type !== SaleUnitType.Service
        ) {
          return;
        }

        try {
          order = await this.saleOrderService.submit(
            {
              saleUnit: saleUnit.id,
              user: registered_service.userId,
              submitAt: data.submitAt,
              freeReception: false,
              isArchived: true,
              items: [
                {
                  amount: registered_service.amount,
                  contractor: el.isPaymentCont
                    ? registered_service.contractor
                    : (null as any),
                  isArchived: true,
                  discount: registered_service.discount,
                  duration: registered_service.duration,
                  registeredService: registered_service.id,
                  manualPrice: registered_service.manualPrice,
                  persons: 1,
                  quantity:
                    registered_service?.credit - registered_service?.usedCredit,
                  type: SaleUnitType.Reception,
                  product: registered_service.productId,
                  price: registered_service.price,
                  priceId: registered_service?.priceId,
                  isPaymentContractor: !!el.isPaymentCont
                }
              ],
              isBurn: true
            },
            user
          );

          console.log('the order is', order);

          if (order) {
            orders.push(order);
          }
        } catch (error) {
          errors.push(error);
        }
        return { response: orders, errors };
      });

      console.log('the response is', response, allErrors, allOrder);
      if (response?.response.length > 0) {
        allOrder.push(...response.response);
      }

      if (response?.errors.length > 0) {
        allErrors.push(...response.errors);
      }
    }

    return { response: allOrder, errors: allErrors };
  }

  @Post('check-contractor-payment')
  async checkContractorPayment(@Body() body: any, @CurrentUser() user: any) {
    console.log('body', body);
    const fixed = [];
    const notFixed = [];
    const total = [];
    const where = {
      isBurn: true,
      isPaymentContractor: true,
      type: SaleUnitType.Reception
    };
    if (where) {
      where['id'] = body?.id;
    }
    const registers = await SaleItem.find({
      where: where,
      relations: ['product', 'registeredService', 'contractorIncomes']
    });
    if (registers.length === 0) {
      throw new BadRequestException('Not found ');
    }
    for (let index = 0; index < registers.length; index++) {
      const element = registers[index];
      const findContarctor = await ContractorIncome.findOne({
        where: { saleItem: { id: element.id } },
        relations: ['saleItem']
      });
      if (!findContarctor) {
        total.push(element);
        const pi = await this.contractorService.processContractorIncome(
          element,
          element.product,
          user,
          this.datasource.manager,
          true
        );
        if (!pi) {
          notFixed.push(element);
          // throw new BadRequestException('sth happned');
        } else {
          await pi.save();
          element.contractorIncomes.push(pi);
          element.save();
          fixed.push(element);
        }
      }
    }

    return {
      total,
      fixed,
      notFixed,
      totallength: total.length,
      fixedlength: fixed.length,
      notFixedlength: notFixed.length
    };
  }
}
