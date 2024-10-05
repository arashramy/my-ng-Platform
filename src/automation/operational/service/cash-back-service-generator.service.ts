import { Injectable } from '@nestjs/common';
import {
  ProductCategory,
  ProductType
} from '../../../automation/base/entities/ProductCategory';
import { Product } from '../../../automation/base/entities/Product';

@Injectable()
export class CashBackServiceGeneratorService {
  async createService() {
    const category = await this.createCategory();
    const productPayload = this.preparePayload(category);
    return Product.save(Product.create(productPayload));
  }

  private createCategory() {
    return ProductCategory.save(
      ProductCategory.create({
        title: 'دسته بندی کش بک',
        type: ProductType.Credit
      })
    );
  }

  private preparePayload(category: ProductCategory) {
    return {
      sku: 'خدمت کش بک',
      title: 'خدمت کش بک',
      category: category,
      price: 0,
      discount: 0,
      tax: 0,
      duration: 30,
      isLocker: false,
      unlimited: false,
      related: false,
      manualPrice: false,
      convertToIncomeAfterArchived: false,
      reservable: false,
      isCashBack: false,
      withGuest: false,
      status: true,
      isInsuranceService: false,
      isSubscriptionService: false,
      isGift: false,
      priceList: [],
      schedules: [],
      contractors: [],
      partners: [],
      subProducts: [],
      alarms: [],
      type: ProductType.Credit,
      isGiftGenerator: true
    };
  }
}
