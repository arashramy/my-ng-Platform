import {
  common_permissions,
  hasAnyPermissions,
  ReadController
} from '../../../common/controller/base.controller';
import { RegisteredServiceStatus, SaleItem } from '../entities/SaleItem';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res
} from '@nestjs/common';
import {
  PermissionAction,
  PermissionKey
} from '../../../common/constant/auth.constant';
import { Role, User } from '../../../base/entities/User';
import { SaleItemService } from '../service/sale-item.service';
import moment from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { CurrentOrgUnit } from '../../../common/decorators/current-org-unit.decorator';
import { CurrentFiscalYear } from '../../../common/decorators/current-fiscal-year.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { SseService } from '../../../common/sse/sse.service';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';

import { ChargingServiceProvider } from '../service/charging-service.service';
import { ArchivedRegisteredServiceDto } from '../dto/registered-service.dto';
import { ArchivedProvider } from '../service/archived-provider';
import { ContractorService } from '../../../automation/base/service/contractor.service';
import { ContractorIncome } from '../entities/ContractorIncome';
import { MoreThanOrEqual } from 'typeorm';
import { SaleOrder } from '../entities/SaleOrder';
import { LockerItem, LockerStatus, LockerType } from '../entities/LockerItem';
import { Response } from 'express';
import { getExportOptions } from '../../../common/decorators/export.decorator';
import { Queue } from 'bull';

@Controller('/api/sale-item')
export class SaleItemController extends ReadController<SaleItem> {
  constructor(
    private saleItemService: SaleItemService,
    private readonly sseService: SseService,
    private archivedProvider: ArchivedProvider,
    private chargingService: ChargingServiceProvider,
    private contractorService: ContractorService,
    // @InjectQueue('reserve-order') public reserveOrderQueue: Queue
  ) {
    super(SaleItem, PermissionKey.AUTOMATION_OPT_ORDERS);
  }

  @Get('/order/:id')
  async getSaleOrderBasedOnSaleItemId(@Param('id', ParseIntPipe) id: number) {
    const order = await SaleOrder.findOne({
      where: { items: { id } },
      relations: { items: { product: true }, subProductOrders: { items: true } }
    });
    if (order?.subProductOrders) {
      order.subProductOrders = order.subProductOrders.filter(
        (e) => !e.isCanceled
      );
    }
    return {
      ...(order || {}),
      reservationPenalty: order?.items?.[0]?.product?.reservationPenalty
    };
  }

  @Get('get-classroom/:id')
  getByClassroom(@Param('id', ParseIntPipe) id: number, @Query() params: any) {
    return SaleItem.find({
      where: {
        groupClassRoom: { id },
        contractor: { id: params?.contractor },
        end: MoreThanOrEqual(moment().toDate())
      },
      relations: ['user', 'contractor']
    });
  }

  @Post('count-user-saleItem')
  async countUserSaleItem(@Body() body: { user: number; pricIds: number[] }) {
    const answers = [];
    for (let index = 0; index < body.pricIds.length; index++) {
      const element = body.pricIds[index];
      const saleItemsCount = await SaleItem.count({
        where: { user: { id: body.user }, priceId: element },
        relations: ['user']
      });
      answers.push({ pricId: element, count: saleItemsCount });
    }
    return answers;
  }

  @Get('/export')
  @Header('Content-Type', 'text/xlsx')
  async export(
    @Query() params: any,
    @Res() res: Response,
    @CurrentUser() current: User
  ) {
    if (
      !hasAnyPermissions(current, [
        ...common_permissions,
        this.key,
        `${this.key}_${PermissionAction.EXPORT}`
      ])
    ) {
      throw new ForbiddenException('Access denied');
    }
    params.audit = true;
    params.limit = 10000;
    const options = getExportOptions(this.classRef);

    if (options.defaultSelect && options.defaultSelect.length !== 0) {
      let select = params.select?.split(',') || [];
      if (select.length !== 0) {
        options.defaultSelect.forEach((value) => {
          if (!select.includes(value)) {
            select.push(value);
          }
        });
        params.select = select.join(',');
      } else {
        select = [...options.defaultSelect];
        params.select = select.join(',');
      }
    }

    const [models, total] = await this.saleItemService.findAll(params, current);
    let columns: string[] = params.select?.split(',') || [];
    if (!columns.length) {
      columns = this.classRef
        .getRepository()
        .metadata.columns.map((c) => c.propertyName);
    }
    const file = await this.excelService.export(
      options,
      columns,
      total,
      null,
      models
    );
    res.download(file?.name);
  }

  @Get('page')
  async findPageable(
    @Query() params: any,
    @CurrentOrgUnit({ headerOnly: true }) orgUnit,
    @CurrentFiscalYear({ headerOnly: true }) fiscalYear,
    @CurrentUser() current: User
  ) {
    if (
      !hasAnyPermissions(current, [
        ...common_permissions,
        this.key,
        `${this.key}_${PermissionAction.READ}`,
        ...this.additionalPermissions()
      ])
    ) {
      if (current.roles.includes(Role.Contactor)) {
        params.contractor = current.id;
      } else {
        throw new ForbiddenException('Access denied');
      }
    }

    if (!params.limit) {
      params.limit = 10;
    }
    if (!params.organizationUnit) {
      params.organizationUnit = orgUnit;
    }
    params.fiscalYear = fiscalYear;
    const [content, total] = await this.saleItemService.findAll(
      params,
      current
    );
    return { total, content };
  }

  @Get('registered/:user')
  async getRegisteredService(
    @Param('user') user: number,
    @Query('saleUnit') saleUnit?: number,
    @Query('submitAt') submitAt?: string,
    @Query('related') related?: boolean
  ) {
    return this.saleItemService.getRegisteredService(
      user,
      saleUnit,
      submitAt
        ? moment(submitAt, AppConstant.SUBMIT_TIME_FORMAT).toDate()
        : new Date(),
      related
    );
  }


  @Get('charging-service/:user')
  async getChargingService(
    @Param('user') user: number,
    @Query('ids') ids?: string,
    @Query('saleItems') saleItems?: string,
    @Query('organizationUnit') orgUnit?: number,
    @Query('saleUnits') saleUnits?: string,
    @Query('products') products?: string,
    @Query('submitAt') submitAt?: string,
    @Query('chargingServiceId') chargingServiceId?: string,
    @Query('transferableToWallet') transferableToWallet?: string
  ) {
    return this.chargingService.findBy(
      user,
      orgUnit,
      saleUnits,
      products,
      submitAt
        ? moment(submitAt, AppConstant.SUBMIT_TIME_FORMAT).toDate()
        : new Date(),
      saleItems,
      ids,
      +chargingServiceId,
      transferableToWallet
    );
  }

  @Post('/archived')
  async archived(
    @Body() model: ArchivedRegisteredServiceDto,
    @CurrentUser() current: User
  ) {
    return this.archivedProvider.archived(
      model.id,
      model.returnBack,
      model.returnBackContractorIncomeType,
      current,
      RegisteredServiceStatus.ReturnFromSale
    );
  }

  prepareParams(params: any, current: User): any {
    if (current.isJustMembership()) {
      Object.assign(params, { user: current.id });
    } else if (!current.isAdmin()) {
      Object.assign(params, {
        by_access: current.accessShops?.map((s) => s.id).join(',')
      });
    }
    return params;
  }

  @Put()
  async updateItems(@Body() body: any, @CurrentUser() current: User) {
    for (let i = 0; i < body.length; i++) {
      await this.update(body[i].id, body[i], current);
    }
  }

  @Put('/:id')
  async update(
    @Param('id') id: number,
    @Body() body: any,
    @CurrentUser() user: User
  ) {
    let item = await SaleItem.findOne({
      where: { id: id },
      relations: [
        'saleUnit',
        'product',
        'saleUnit.reception',
        'updatedBy',
        'registeredService',
        'contractorIncomes',
        'locker'
      ]
    });
    if (!item) {
      throw new BadRequestException('Not found sale item');
    }

    if (
      !user.isAdmin() &&
      !user.accessShops?.some(
        (s) => s.id == item.saleUnitId || s.id == item.saleUnit?.receptionId
      )
    ) {
      throw new BadRequestException('Not access to sale item');
    }
    if (body.discount || body.discount === 0) {
      item.discount = body?.discount;
    }

    if (item.type === SaleUnitType.Package) {
      const items = await SaleItem.find({
        where: { parent: { id: item.id } },
        relations: ['parent', 'product']
      });
      for (const item of items) {
        const contractor = body.items.find(
          (e) => e.product.id === item.product.id
        ).contractor;
        if (contractor && item.contractorId != contractor?.id) {
          let contractor = await User.findOne({
            where: { id: body.contractor }
          });
          if (!contractor) {
            throw new BadRequestException('Not found contractor');
          }
          item.contractor = contractor;
        }
        if (body.end) {
          item.end = moment(body.end, AppConstant.DATE_FORMAT).toDate();
        }

        if (
          (item.type == SaleUnitType.Service && item.usedCredit == 0) ||
          (item.type == SaleUnitType.Credit && item?.usedCredit == 0) ||
          (item.type == SaleUnitType.Package && item?.usedCredit == 0)
        ) {
          if (
            !moment(body.start, AppConstant.DATE_FORMAT).isSame(
              moment(item.start),
              'date'
            )
          ) {
            item.start = moment(body.start, AppConstant.DATE_FORMAT).toDate();
          }
        }

        console.log(
          'condition',
          item.end >
            moment(
              moment()
                .add(-1, 'day')
                .endOf('day')
                .format(AppConstant.DATETIME_FORMAT)
            ).toDate() && item.credit - item.usedCredit > 0
        );
        if (
          item.end >
            moment(
              moment()
                .add(-1, 'day')
                .endOf('day')
                .format(AppConstant.DATETIME_FORMAT)
            ).toDate() &&
          item.credit - item.usedCredit > 0
        ) {
          console.log('called', item.status);
          item.status = RegisteredServiceStatus.opened;
        }
        item.updatedBy = user;

        await item.save();
      }
    }

    if (item.contractorId != body.contractor) {
      const excontractorIncome = await ContractorIncome.findOne({
        where: { saleItem: { id: item.id }, isPartner: false },
        relations: ['saleItem']
      });

      if (excontractorIncome) {
        excontractorIncome.deletedAt = new Date();
        excontractorIncome.deletedBy = user;
        await excontractorIncome.save();
      }
      console.log(item.contractorIncomes);

      if (item.contractorIncomes.length > 0 && excontractorIncome) {
        item.contractorIncomes = item.contractorIncomes.filter((e) => {
          console.log('e', e);
          return e.id != excontractorIncome.id;
        });
      } else {
        item.contractorIncomes = item.contractorIncomes || [];
      }

      item.contractor = body.contractor;

      if (body.contractor) {
        let contractor = await User.findOne({ where: { id: body.contractor } });
        if (!contractor) {
          throw new BadRequestException('Not found contractor');
        }

        item.contractor = contractor;
        await item.save();

        if (!item.product.unlimited) {
          if (item.product.hasContractor) {
            if (
              !(await this.contractorService.checkPresenceOfContractorInOrganizationUnit(
                body.contractor,
                item.organizationUnitId || item.organizationUnit?.id,
                item.submitAt
              ))
            ) {
              throw new BadRequestException(
                'Contractor not available in this time'
              );
            }
          }

          if (
            item.contractor.id &&
            (!body.isArchived || body.returnBackContractorIncomeType)
          ) {
            let ci = await this.contractorService.processContractorIncome(
              item,
              item.product,
              user,
              null,
              true
            );
            if (ci) item.contractorIncomes.push(ci);
          }
        }
      }
    }
    if (body.end) {
      item.end = moment(body.end, AppConstant.DATE_FORMAT).toDate();
      if (
        item.status === RegisteredServiceStatus.archived &&
        item.end >
          moment(
            moment()
              .add(-1, 'day')
              .endOf('day')
              .format(AppConstant.DATETIME_FORMAT)
          ).toDate() &&
        ((item.type !== SaleUnitType.Package &&
          item.credit - item.usedCredit > 0) ||
          item.type === SaleUnitType.Package)
      ) {
        item.status = RegisteredServiceStatus.opened;
      }
    }
    if (
      (item.type == SaleUnitType.Service && item.usedCredit == 0) ||
      (item.type == SaleUnitType.Credit && item?.usedCredit == 0) ||
      (item.type == SaleUnitType.Package && item?.usedCredit == 0)
    ) {
      if (
        !moment(body.start, AppConstant.DATE_FORMAT).isSame(
          moment(item.start),
          'date'
        )
      ) {
        item.start = moment(body.start, AppConstant.DATE_FORMAT).toDate();
      }
    }
    if (body.deliveredItems) {
      item.deliveredItems = body?.deliveredItems;
      item.totalDelivered = body?.deliveredItems?.reduce(
        (acc, item) => acc + item.deliveredCount,
        0
      );
    }

    if (body?.description) {
      item.description = body?.description;
    }

    console.log('conditionnnn', body?.locker && !!item?.product?.isLocker);
    if (body?.locker && !!item?.product?.isLocker) {
      // const registeredService:
      const vipLocker = await LockerItem.findOne({
        where: { type: LockerType.vip, status: true, id: body.locker }
      });

      if (!vipLocker) {
        throw new BadRequestException('invalid locker');
      }

      const isExitSaleItem = await SaleItem.findOne({
        where: {
          status: RegisteredServiceStatus.opened,
          type: SaleUnitType.Service,
          end: MoreThanOrEqual(new Date()),
          product: {
            isLocker: true
          },
          locker: {
            id: body?.locker,
            type: LockerType.vip
          }
        },
        relations: { locker: true, product: true }
      });

      console.log('vipLocker', vipLocker);

      if (isExitSaleItem && isExitSaleItem?.user !== item.user) {
        throw new BadRequestException('this locker exist');
      }

      item.locker = vipLocker;
      item.lockerId = vipLocker.id;
      item.title = `${item.product.title}(${item.locker.lockerNumber})`;
      console.log('item.lockwer', item.lockerId);
      await item.save();
    }

    item.updatedBy = user;

    if (body.consumer) {
      item.consumer = body.consumer;
    }
    await item.save();
    return item;
  }

  @Get('/contractor-incomes/:id')
  async contractorIncomes(@Param('id') id: number, @CurrentUser() user: User) {
    let item = await SaleItem.findOne({
      where: { id: id },
      relations: ['product', 'contractorIncomes']
    });
    if (!item) {
      return [];
    }
    if (!item.product.hasContractor) {
      return [];
    }
  }


  additionalPermissions(): string[] {
    return [];
  }
}
