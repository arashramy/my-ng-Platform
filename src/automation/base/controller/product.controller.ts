import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query
} from '@nestjs/common';
import {
  PermissionAction,
  PermissionKey
} from '../../../common/constant/auth.constant';
import { Product } from '../entities/Product';
import { BaseController } from '../../../common/controller/base.controller';
import { User } from '../../../base/entities/User';
import { ProductPrice } from '../entities/ProductPrice';
import { ProductSchedule } from '../entities/ProductSchedule';
import { ProductContractor } from '../entities/ProductContractor';
import { ProductService } from '../service/product.service';
import moment from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';
import { SaleItem } from '../../operational/entities/SaleItem';
import { In } from 'typeorm';
import { ProductType } from '../entities/ProductCategory';

@Controller('/api/product')
export class ProductController extends BaseController<Product> {
  constructor(private productService: ProductService) {
    super(Product, PermissionKey.AUTOMATION_BASE_PRODUCT);
  }

  prepareParams(params: any, current: User): any {
    if (current?.isAdmin()) {
      return params;
    }
    Object.assign(params, {
      'saleUnit.in': current?.accessShops?.map((s) => s.id)
    });
    return params;
  }

  @Get('/available')
  finds(
    @Query('category') category: number,
    @Query('saleUnit') saleUnit: number,
    @Query('type') type: SaleUnitType,
    @Query('submitAt') submitAt?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return this.productService.finds(
      category,
      saleUnit,
      type,
      submitAt && moment(submitAt).isValid()
        ? moment(submitAt, AppConstant.SUBMIT_TIME_FORMAT).toDate()
        : new Date(),
      offset,
      limit
    );
  }

  @Get('/open-service')
  findOpenService(
    @Query('saleUnit') saleUnit?: number,
    @Query('submitAt') submitAt?: string,
    @Query('related') related?: boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return this.productService.getOpenService(
      saleUnit,
      submitAt && moment(submitAt).isValid()
        ? moment(submitAt, AppConstant.SUBMIT_TIME_FORMAT).toDate()
        : new Date(),
      related,
      offset,
      limit
    );
  }

  @Get('/price-list/:id')
  priceList(@Param('id') id: number) {
    return ProductPrice.find({ where: { product: { id: id } }, cache: 30000 });
  }

  @Get('/schedules/:id')
  schedules(@Param('id') id: number) {
    return ProductSchedule.find({
      where: { product: { id: id } },
      cache: 30000
    });
  }

  @Get('/sub-product/:id')
  subProduct(@Param('id') id: number) {
    return this.productService.findSubProducts(id);
  }

  @Get('/contractors/:id')
  getContractors(@Param('id') id: number) {
    return User.createQueryBuilder('q')
      .innerJoin(
        ProductContractor,
        'c',
        'q.id=c.contractor AND c.product = :product',
        { product: id }
      )
      .cache(true)
      .getMany();
  }

  @Get('remove-contractor/:contractor/:service')
  async removeContractor(
    @Param('contractor') contractor: any,
    @Param('service') service: any
  ) {
    const register = await SaleItem.findOne({
      where: {
        product: { id: service },
        contractor: { id: contractor },
        isBurn: false,
        type: SaleUnitType.Service
      },
      relations: ['product', 'contractor']
    });

    return register ? false : true;
  }

  async prepareCreate(model: Product, current: User): Promise<Product> {
    const entity: Product = await super.prepareCreate(model, current);
    entity.hasSchedules = !!entity.schedules?.length;
    entity.hasPriceList = !!entity.priceList?.length;
    entity.hasContractor = entity.contractors?.length && !entity.unlimited;
    entity.hasPartner = !!entity.partners?.length;
    if (entity.type == ProductType.Package) {
      let tax = 0;
      entity.hasSubProduct = !!entity.subProducts?.length;
      let price = 0,
        discount = 0;
      for (const sub of entity.subProducts) {
        let subPrice = 0;
        if (sub.product?.type === ProductType.Product) {
          subPrice = +sub.product.price * (sub.quantity || 1);
          discount += +sub.discount * (sub.quantity || 1);
        } else if (sub.product?.type === ProductType.Credit) {
          subPrice = +sub.product.price;
          discount += +sub.discount;
        } else {
          subPrice = +sub.price.price;
          discount += +sub.discount;
        }
        price += subPrice;
        if (sub.product.tax) {
          tax = ((subPrice - discount) * +sub.product.tax) / 100;
        }
      }
      entity.price = price;
      entity.discount = discount;
      entity.tax = (tax * 100) / (price - discount);
    }
    console.log(2122112, entity.reservationPenalty);
    entity.reservationPenalty = entity?.reservationPenalty?.map((e) => {
      switch (e.unit) {
        case 'HOUR':
          e.hourAmount = e.quantity;
          break;
        case 'DAY':
          e.hourAmount = e.quantity * 24;
          break;
        case 'WEEK':
          e.hourAmount = e.quantity * 168;
          break;

        case 'MONTH':
          e.hourAmount = e.quantity * 730;
          break;
        default:
          break;
      }
      return e;
    });
    return entity;
  }

  async prepareEdit(
    model: Product,
    entity: Product,
    current: User
  ): Promise<Product> {
    const contractors = (
      await Product.findOne({
        where: { id: entity.id },
        relations: ['contractors']
      })
    ).contractors;
    for (let i = 0; i < contractors.length; i++) {
      if (
        !model.contractors.some((item) => {
          return item?.contractor?.id === contractors[i].contractorId;
        })
      ) {
        const register = await SaleItem.findOne({
          where: {
            product: { id: model.id },
            contractor: { id: contractors[i].contractorId },
            isBurn: false,
            type: SaleUnitType.Service
          },
          relations: ['product', 'contractor']
        });
        if (register) {
          throw new BadRequestException('you can not remove active contractor');
        }
      }
    }

    entity = await super.prepareEdit(model, entity, current);
    entity.hasSchedules = !!model.schedules?.length;
    entity.hasPriceList = !!model.priceList?.length;
    entity.hasContractor = model.contractors?.length && !entity.unlimited;
    entity.hasPartner = !!entity.partners?.length;

    if (entity.type == ProductType.Package) {
      let tax = 0;
      entity.hasSubProduct = !!entity.subProducts?.length;
      let price = 0,
        discount = 0;
      for (const sub of entity.subProducts) {
        let subPrice = 0;
        if (sub.product?.type === ProductType.Product) {
          subPrice = +sub.product.price * (sub.quantity || 1);
          discount += +sub.discount * (sub.quantity || 1);
        } else if (sub.product?.type === ProductType.Credit) {
          subPrice = +sub.product.price;
          discount += +sub.discount;
        } else {
          subPrice = +sub.price.price;
          discount += +sub.discount;
        }
        price += subPrice;
        if (sub.product.tax) {
          tax = ((subPrice - discount) * +sub.product.tax) / 100;
        }
      }
      entity.price = price;
      entity.discount = discount;
      entity.tax = (tax * 100) / (price - discount);
      console.log(price, discount, tax, entity.tax);
    }

    console.log(545454, entity.reservationPenalty);
    if (entity.reservationPenalty) {
      // HOUR
      // DAY day * 24
      // WEEK week * 168
      // MONTH month * 730
      entity.reservationPenalty = entity.reservationPenalty.map((e) => {
        switch (e.unit) {
          case 'HOUR':
            e.hourAmount = e.quantity;
            break;
          case 'DAY':
            e.hourAmount = e.quantity * 24;
            break;
          case 'WEEK':
            e.hourAmount = e.quantity * 168;
            break;

          case 'MONTH':
            e.hourAmount = e.quantity * 730;
            break;
          default:
            break;
        }
        return e;
      });
    }
    console.log(48545, entity.reservationPenalty);
    return entity;
  }

  async prepareDelete(id: number[] | number, current: User): Promise<void> {
    if (
      (await SaleItem.countBy({
        product: { id: Array.isArray(id) ? In(id) : id }
      })) > 0
    ) {
      throw new BadRequestException('Unabled delete product.');
    }
    return super.prepareDelete(id, current);
  }

  additionalPermissions(): any[] {
    return [
      `${PermissionKey.AUTOMATION_OPT_ORDERS}_${PermissionAction.READ}`,
      PermissionKey.AUTOMATION_BASE_SHOPS_UNIT,
      `${PermissionKey.AUTOMATION_BASE_SHOPS_UNIT}_${PermissionAction.READ}`,
      `${PermissionKey.AUTOMATION_BASE_SHOPS_UNIT}_${PermissionAction.CREATE}`,
      `${PermissionKey.AUTOMATION_BASE_SHOPS_UNIT}_${PermissionAction.UPDATE}`
    ];
  }
}
