import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  NotFoundException,
  Post,
  UseInterceptors
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CreateGiftPackageDTO } from '../dto/create-gift-package.dto';
import { Product } from '../../automation/base/entities/Product';
import { GiftPackage, GiftPackageStatus } from '../entities/GiftPackage';
import { EditUserGiftPackageDTO } from '../dto/edit-user-gift-package.dto';
import { ProductPrice } from '../../automation/base/entities/ProductPrice';
import { SaleUnit } from '../../base/entities/SaleUnit';
import { OrganizationUnit } from '../../base/entities/OrganizationUnit';
import { CurrentFiscalYear } from '../../common/decorators/current-fiscal-year.decorator';
import { FiscalYear } from '../../base/entities/FiscalYears';
import { ReadController } from '../../common/controller/base.controller';
import { PermissionKey } from '../../common/constant/auth.constant';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../base/entities/User';
import { AccessOrganizationFiscalYearInterceptor } from '../../common/interceptors/access-organization-fiscal-year.interceptor';
import moment, { now } from 'moment';
import { AppConstant } from '../../common/constant/app.constant';

@Controller('/api/gift-package')
export class GiftPackageController extends ReadController<GiftPackage> {
  constructor(@InjectQueue('gift-package') public giftPackageQueue: Queue) {
    super(GiftPackage, PermissionKey.BASE_GIFT_PACKAGE);
  }

  additionalPermissions(): string[] {
    return [];
  }

  @Post()
  async createGiftPackage(
    @Body() dto: CreateGiftPackageDTO,
    @CurrentUser() currentUser: User
  ) {
    const product = await Product.findOne({
      where: { id: dto.productId, isGift: true }
    });
    if (!product) {
      throw new NotFoundException('product not defined as gift');
    }
    if (dto.productPriceId) {
      const priceId = await ProductPrice.findOne({
        where: { id: dto.productPriceId as number }
      });

      if (!priceId) {
        throw new NotFoundException('product price not defined');
      }
    }
    if (
      moment(dto.startProductAt).isBefore(
        moment().format(AppConstant.DATE_FORMAT)
      )
    ) {
      throw new BadRequestException('invalid start product at');
    }

    const saleUnit = await SaleUnit.findOne({ where: { id: dto.saleUnitId } });

    if (!saleUnit) {
      throw new NotFoundException('sale unit is not defined');
    }

    const giftPackage = await GiftPackage.save(
      GiftPackage.create({
        title: dto.title,
        product: product,
        status: GiftPackageStatus.Pending,
        startProductAt: dto.startProductAt,
        submitAt: new Date(),
        giftType: dto.giftType,
        productPriceId: dto.productPriceId,
        saleUnitId: dto.saleUnitId,
        createdAt: new Date(),
        createdBy: currentUser
      })
    );
    return giftPackage;
  }

  @Delete(':id')
  deleteGiftPackage() {}

  @Post('/edit-user')
  @UseInterceptors(AccessOrganizationFiscalYearInterceptor)
  async editUserGifPackage(
    @Body() dto: EditUserGiftPackageDTO,
    @CurrentUser() currentUser: User,
    @CurrentFiscalYear() currentFiscalYear: FiscalYear
  ) {
    const giftPackage = await GiftPackage.findOne({
      where: { id: dto.id },
      relations: { product: true }
    });
    if (!giftPackage) {
      throw new NotFoundException('gift package is not defined');
    }
    const saleUnit = await SaleUnit.findOne({
      where: { id: giftPackage.saleUnitId },
      relations: { organizationUnit: true }
    });

    const productPrice = await ProductPrice.findOne({
      where: { id: giftPackage.productPriceId }
    });

    giftPackage.filter = dto.filter;
    await giftPackage.save();

    await this.giftPackageQueue.add('add-user', {
      ...dto,
      giftPackage,
      orgUnit: saleUnit.organizationUnit,
      saleUnit,
      fiscalYear: currentFiscalYear,
      productPrice,
      currentUser
    });
  }
}
