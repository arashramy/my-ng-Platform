import {BadRequestException, Injectable} from '@nestjs/common';
import {In, Raw} from 'typeorm';
import {SaleUnit} from '../entities/SaleUnit';
import {ProductCategory, ProductType,} from '../../automation/base/entities/ProductCategory';
import {SaleUnitsCategoryDto} from '../../automation/base/dto/sale-units-category.dto';
import {SaleItem} from '../../automation/operational/entities/SaleItem';
import {Product,} from '../../automation/base/entities/Product';
import { SaleUnitType } from '../../automation/operational/entities/SaleItem';


@Injectable()
export class SaleUnitService {
  async getShopsByCategory(
      ids: number[],
      type: SaleUnitType,
      orgUnit?: number[] | number,
  ) {
    let shops = await this.getShopsByIds(ids, type);
    let out: SaleUnitsCategoryDto[] = shops.map((s) => ({
      id: s.id,
      types: s.types,
      image: s.image,
      title: s.title,
      categories: [],
    }));
    let mapped: { [key: number]: SaleUnitsCategoryDto } = {};
    for (let shop of out) {
      // mapped[shop.id] = shop;
    }
    if (out && out.length > 0) {
      let categories = await this.getCategoryByShopIds(shops.map((s) => s.id));
      // for (let ctg of categories) {
      //   mapped[ctg.shop]?.categories?.push(ctg);
      // }
    }
    return Object.values(mapped);
  }

  async getShopsByIds(
    ids: number[],
    type: SaleUnitType,
    orgUnit?: number[] | number,
  ) {
    return SaleUnit.findBy({
      id: In(ids),
      types: Raw(`::jsonb ? ${type}`),
      organizationUnit: { id: Array.isArray(orgUnit) ? In(orgUnit) : orgUnit },
    });
  }

  async getCategoryByShopId(saleUnitId: number, type: ProductType = ProductType.Product) {
    return ProductCategory.createQueryBuilder('productCategoryQB')
        .where('productCategoryQB.type = :type', {type: type})
        .andWhere(
            `productCategoryQB.id in(${Product.createQueryBuilder('productQB')
                .select(['productQB.category'])
                .leftJoin('productQB.authorizedSalesUnits', 'su')
                .where('productQB.category IS NOT NULL')
                .andWhere(`su.id = ${saleUnitId} OR su.id IS NULL`)
                .andWhere(`productQB.deleted_at IS NULL AND productQB.type = ${type}`)
                .groupBy('category')
                .having('COUNT(productQB.id) > 0')
                .getQuery()})`,
        )
      .getMany();
  }

  async getCategoryByShopIds(ids: number[]) {
    return ProductCategory.createQueryBuilder('pg')
      .addSelect('shop.count', 'pg.count')
      .addSelect('shop.unit', 'pg.shop')
      .leftJoin(
        (qb) =>
          qb
            .from(Product, 'sale_unit_product')
            .select(['category', 'unit'])
            .addSelect('COUNT(sale_unit_product.product)', 'count')
            .where({ 'sale_unit_product.unit': In(ids) })
            .groupBy('sale_unit_product.category')
            .addGroupBy('sale_unit_product.unit'),
        'shop',
        'sale_unit_product.category = pg.id AND sale_unit_product.deleted_at IS NULL',
      )
      .where('shop.category IS NOT NULL AND shop.count > 0')
      .orderBy('shop.count DESC')
      .getMany();
  }

  async existRelation(id: number | number[]) {
    const product = await Product.find({
      where: [
        { authorizedSalesUnits: { id: Array.isArray(id) ? In(id) : id } },
        { authorizedDeliveryUnits: { id: Array.isArray(id) ? In(id) : id } },
      ],
      relations: ['authorizedSalesUnits', 'authorizedDeliveryUnits'],
    });

    if (product.length > 0) {
      throw new BadRequestException(
        'You Cant Delete SaleUnit When Use in product',
      );
    }

    const saleitem = await SaleItem.find({
      where: { saleUnit: { id: Array.isArray(id) ? In(id) : id } },
    });

    if (saleitem.length > 0) {
      throw new BadRequestException(
        'You Cant Delete SaleUnit When Use in sale Item',
      );
    }
  }

  findSaleUnitById(id: number) {
    return SaleUnit.findOne({ where: { id } });
  }
}
