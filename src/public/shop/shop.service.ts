import { Injectable } from '@nestjs/common';
import { Product } from '../../automation/base/entities/Product';
import { Location } from '../../base/entities/Location';
import { IsNull } from 'typeorm';

@Injectable()
export class ShopService {
  async getProductByCategory(id: number, limit?: number, page?: number) {
    const limitValue = limit || 1;
    const pageValue = page || 0;
    const [data, totalAmount] = await Product.findAndCount({
      where: id ? { category: { id } } : {},
      skip: limitValue * pageValue,
      take: limitValue,
      order: {
        createdAt: 'DESC',
      },
      relations: ['priceList', 'subProducts', 'category', 'unit']
    });

    return { data, totalAmount };
  }

  getLocation(organizationUnitId: number) {
    return Location.find({
      relations: ['childrens', 'saleUnit', 'saleUnit.organizationUnit'],
      where: {
        parent: IsNull(),
        saleUnit: {
          organizationUnit: {
            id: organizationUnitId,
          },
        },
      },
    });
  }
}
