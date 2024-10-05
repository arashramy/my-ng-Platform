import {
  ConflictException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards
} from '@nestjs/common';
import { Event } from '../../../automation/base/entities/Event';
import { PermissionKey } from '../../../common/constant/auth.constant';
import { BaseController } from '../../../common/controller/base.controller';
import { Role, User } from '../../../base/entities/User';
import { ProductCategory } from '../../../automation/base/entities/ProductCategory';
import { In, IsNull, Not } from 'typeorm';
import { EventSubProduct } from '../../../automation/base/entities/EventSubProduct';
import { Product } from '../../../automation/base/entities/Product';
import { SubProduct } from '../../../automation/base/entities/SubProduct';
import { SaleOrder } from '../entities/SaleOrder';
import { SaleItem } from '../entities/SaleItem';
import { AccessTokenGuard } from '../../../auth/guard/access-token.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { createQueryForEntity } from '../../../common/decorators/mvc.decorator';
import { ProductPrice } from '../../../automation/base/entities/ProductPrice';

@Controller('/api/events')
export class EventsController extends BaseController<Event> {
  constructor() {
    super(Event, PermissionKey.AUTOMATION_OPT_EVENTS);
  }

  @Get('orders/:eventId/:productCategoryId')
  async getOrderEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('productCategoryId', ParseIntPipe) productCategoryId: number
  ) {
    const products = await Product.find({
      where: { category: { id: productCategoryId, forEvent: true } },
      relations: { priceList: true, category: true }
    });

    const productsId = products.map((product) => product.id);

    const ordersSaleItems = await SaleItem.find({
      where: {
        saleOrder: { event: { id: eventId } },
        product: { id: In(productsId) }
      },
      relations: {
        product: true,
        user: true
      }
    });

    const productPrices = products.reduce((productPrices, product) => {
      product.priceList.map((price) => {
        productPrices[price.id] = {
          title: price.title,
          user:
            ordersSaleItems.find(
              (e) =>
                e.product.id === product.id &&
                e.eventSelectedPriceId === price.id
            )?.user || null
        };
      });
      return productPrices;
    }, {});

    return productPrices;
  }

  async prepareCreate(model: Event, current: User): Promise<Event> {
    const entity = await super.prepareCreate(model, current);
    if ((await Event.count({ where: { title: entity.title } })) !== 0) {
      throw new ConflictException('duplicated in title');
    }
    entity.productCategories = await ProductCategory.find({
      where: { id: In(model.productCategories) }
    });
    entity.subProducts = [];
    for (let i = 0; i < model.subProducts.length; i++) {
      const product = await Product.findOne({
        where: { id: model.subProducts[i]?.product as any }
      });
      const productCategories = await SubProduct.find({
        where: { id: In(model.subProducts[i].productCategories || []) }
      });
      entity.subProducts.push(
        await EventSubProduct.save(
          EventSubProduct.create({
            ...model.subProducts[i],
            product,
            productCategories
          })
        )
      );
    }

    return entity;
  }

  async prepareEdit(
    model: Event,
    entity: Event,
    current: User
  ): Promise<Event> {
    const updatedEntity = await super.prepareEdit(model, entity, current);
    updatedEntity.productCategories = await ProductCategory.find({
      where: { id: In(updatedEntity.productCategories) }
    });

    updatedEntity.subProducts = [];
    for (let i = 0; i < model.subProducts.length; i++) {
      const product = await Product.findOne({
        where: { id: model.subProducts[i]?.product as any }
      });
      const productCategories = await SubProduct.find({
        where: { id: In(model.subProducts[i].productCategories || []) }
      });
      updatedEntity.subProducts.push(
        await EventSubProduct.save(
          EventSubProduct.create({
            ...model.subProducts[i],
            product,
            productCategories
          })
        )
      );
    }

    return updatedEntity;
  }

  additionalPermissions(): string[] {
    return [Role.Membership];
  }

  @Get('own')
  @UseGuards(AccessTokenGuard)
  async getOwnEvent(@CurrentUser() user: User, @Query() query: any) {
    const [content, total] = await this.postFetchAll(
      await createQueryForEntity(
        SaleOrder,
        { ...query, user: +user.id, 'event.neq': null },
        'findAll',
        user,
        this.req
      ).getManyAndCount()
    );

    let x = [
      ...new Set(
        (content as any)
          .map((order) => order.items.map((item) => item.product.categoryId))
          .reduce((acc, item) => {
            item.filter((i) => i).map((i) => acc.push(i));
            return acc;
          }, [])
      )
    ];
    for (let i = 0; i < x.length; i++) {
      x[i] = {
        cid: x[i],
        category: await ProductCategory.findOne({
          where: { id: x[i] as any }
        })
      };
    }

    let prices = [
      ...new Set(
        (content as any)
          .map((order) => order.items.map((item) => item.eventSelectedPriceId))
          .reduce((acc, item) => {
            item.filter((i) => i).map((i) => acc.push(i));
            return acc;
          }, [])
      )
    ];

    for (let i = 0; i < prices.length; i++) {
      prices[i] = {
        pid: prices[i],
        price: await ProductPrice.findOne({
          where: { id: prices[i] as any }
        })
      };
    }

    return {
      total,
      content: (content as any).map((order) => ({
        ...order,
        items: order.items.map((item) => ({
          ...item,
          eventSelectedPrice: (prices as any)?.find(
            (e: any) => e.pid === item.eventSelectedPriceId
          )?.price,
          product: {
            ...item.product,
            category: (x as any)?.find(
              (e: any) => e.cid === item.product.categoryId
            )?.category
          }
        }))
      }))
    };
  }
}
