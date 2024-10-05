import { Inject, Injectable } from '@nestjs/common';
import { GiftPackage, GiftPackageStatus } from '../entities/GiftPackage';
import { ProductType } from '../../automation/base/entities/ProductCategory';
import { SaleItem } from '../../automation/operational/entities/SaleItem';
import { EditUserGiftPackageProcessorDTO } from '../dto/edit-user-gift-package.dto';
import { User } from '../../base/entities/User';
import { SaleOrderDto } from '../../automation/operational/dto/sale-order.dto';
import moment from 'moment';
import { SaleOrderService } from '../../automation/operational/service/sale-order.service';
import { AppConstant } from '../../common/constant/app.constant';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../../common/constant/events.constant';
import { PermissionKey } from '../../common/constant/auth.constant';
import {
  SaleUnitType
} from '../../automation/operational/entities/SaleItem';

@Injectable()
export class GiftPackageProcessService {
  @Inject(SaleOrderService)
  private readonly saleOrderService: SaleOrderService;

  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;

  async updateGiftPackageAfterUserAssign(
    userId: number,
    orderId: number,
    giftPackageId: number
  ) {
    const giftPackage = await GiftPackage.findOneBy({ id: giftPackageId });
    giftPackage.saleOrders.push({ userId, orderId });
    return giftPackage.save();
  }

  async deleteOrderGiftPackage(
    userId: number,
    orderId: number,
    giftPackageId: number
  ) {
    const giftPackage = await GiftPackage.findOneBy({ id: giftPackageId });
    if (!giftPackage) {
      console.log('failed ...');
      return;
    }
    giftPackage.saleOrders = giftPackage.saleOrders.filter(
      (so) => so.orderId !== orderId && so.userId !== userId
    );
    await giftPackage.save();
    await SaleItem.update({ id: orderId }, { deletedAt: new Date() });
  }

  prepareServicePayload(
    payload: EditUserGiftPackageProcessorDTO,
    user: number
  ): SaleOrderDto {
    return {
      organizationUnit: payload.orgUnit.id,
      saleUnit: payload.saleUnit.id,
      user,
      submitAt: moment(payload.giftPackage.submitAt).format(
        AppConstant.DATETIME_FORMAT
      ),
      fiscalYear: payload.fiscalYear,
      freeReception: true,
      isGift: true,
      items: [
        {
          isGift: true,
          product: payload.giftPackage.product.id,
          duration: payload.productPrice.duration,
          discount: 0,
          price: 0,
          type: SaleUnitType.Service,
          start: moment(payload.giftPackage.startProductAt).format(
            AppConstant.DATE_FORMAT
          ),
          end: moment(payload.giftPackage.startProductAt)
            .add(payload.giftPackage.product.duration, 'day')
            .format(AppConstant.DATE_FORMAT),
          credit: payload.productPrice.min
        }
      ]
    };
  }

  prepareCreditPayload(
    payload: EditUserGiftPackageProcessorDTO,
    user: number
  ): SaleOrderDto {
    return {
      isGift: true,
      freeReception: true,
      organizationUnit: payload.orgUnitId,
      saleUnit: payload.saleUnit.id,
      submitAt: moment(payload.giftPackage.submitAt).format(
        AppConstant.DATETIME_FORMAT
      ),
      user,
      lockers: [],
      lockerQuantity: 0,
      items: [
        {
          isGift: true,
          product: payload.giftPackage.product.id,
          duration: payload.productPrice.duration,
          quantity: 1,
          discount: 0,
          price: payload.productPrice.price,
          tax: 0,
          amount: payload.productPrice.price,
          manualPrice: false,
          type: SaleUnitType.Credit,
          registeredService: 0,
          start: moment(payload.giftPackage.startProductAt).format(
            AppConstant.DATE_FORMAT
          ),
          end: moment(payload.giftPackage.startProductAt)
            .add(payload.giftPackage.product.duration, 'day')
            .format(AppConstant.DATE_FORMAT),
          priceId: payload.productPrice.id
        }
      ]
    };
  }

  async addOrderGiftPackage(
    payload: EditUserGiftPackageProcessorDTO,
    item: number
  ) {
    try {
      const saleOrderPayload =
        payload.giftPackage.giftType === ProductType.Service
          ? this.prepareServicePayload(payload, item)
          : this.prepareCreditPayload(payload, item);
      await this.saleOrderService.submit(
        saleOrderPayload,
        undefined,
        async (order) => {
          await this.updateGiftPackageAfterUserAssign(
            item,
            order?.items?.[0]?.id,
            payload.giftPackage.id
          );
        }
      );
    } catch (error) {
      console.log(1234, error);
    }
  }

  findDeletedItemsInAddOrDeleteGiftPackage(
    payload: EditUserGiftPackageProcessorDTO
  ) {
    const saleOrders = payload.giftPackage.saleOrders;
    const usedSaleOrders = payload.giftPackage.usedSaleOrder;
    const deletedUserIds = [];
    for (let i = 0; i < saleOrders.length; i++) {
      const order = saleOrders[i];
      if (!payload.usersId.includes(order.userId)) {
        deletedUserIds.push(order);
      }
    }
    return deletedUserIds.filter(
      (dui) => !usedSaleOrders.find((uso) => uso.orderId === dui.orderId)
    );
  }

  findInsertedItemsInAddOrDeleteGiftPackage(
    payload: EditUserGiftPackageProcessorDTO
  ) {
    const saleOrders = payload.giftPackage.saleOrders;
    let result: any = [];
    if (saleOrders.length === 0) result = payload.usersId;
    result = payload.usersId.filter((usr) => {
      return !saleOrders.find((so) => so.userId === usr);
    });
    const usedSaleOrders = payload.giftPackage.usedSaleOrder;
    return result.filter((r) => !usedSaleOrders.includes(r));
  }

  async addOrDeleteGiftPackage(payload: EditUserGiftPackageProcessorDTO) {
    try {
      const deletedItems =
        this.findDeletedItemsInAddOrDeleteGiftPackage(payload);

      const insertedItems =
        this.findInsertedItemsInAddOrDeleteGiftPackage(payload);

      console.log('deleted items', deletedItems);

      console.log('inserted items', insertedItems);

      if (deletedItems.length > 0) {
        for (let i = 0; i < deletedItems.length; i++) {
          const deletedItem = deletedItems[i];
          console.log(`Delete : ${deletedItem}`);
          await this.deleteOrderGiftPackage(
            deletedItem.userId,
            deletedItem.orderId,
            payload.giftPackage.id
          );
        }
      }
      if (insertedItems.length > 0) {
        for (let i = 0; i < insertedItems.length; i++) {
          const item = insertedItems[i];
          console.log(`Insert : ${item}`);
          await this.addOrderGiftPackage(payload, item);
        }
      }
    } catch (error) {
      console.log('error', error);
    }
  }

  updateGiftPackageStatus(
    id: number,
    status: GiftPackageStatus,
    failedMessage?: string
  ) {
    const updateObject: any = { status };
    if (failedMessage) {
      updateObject.failedMessage = failedMessage;
    }
    return GiftPackage.update({ id }, updateObject);
  }

  async findUsedGiftPackages(saleItemIds: number[], userId: number) {
    const giftPackages = await GiftPackage.find({});
    return giftPackages.filter(
      (giftPackage) =>
        giftPackage.saleOrders.find((saleOrder) => {
          return (
            saleOrder.userId === userId &&
            saleItemIds.includes(saleOrder.orderId)
          );
        }) &&
        !giftPackage.usedSaleOrder.find(
          (usedOrder) =>
            saleItemIds.includes(usedOrder.orderId) &&
            usedOrder.userId === userId
        )
    );
  }

  // process handlers

  async onUpdateUsedGiftPackageBasedOnSaleItem(userId: number) {
    const saleItems = await SaleItem.find({
      where: { user: { id: userId }, isGift: true }
    });
    if (saleItems.length > 0) {
      const saleItemIds = this.transformUsedSaleItem(saleItems);

      const usedGiftPackages = await this.findUsedGiftPackages(
        saleItemIds,
        userId
      );
      for (let i = 0; i < saleItemIds.length; i++) {
        const item = saleItemIds?.[i];
        const isExistBefore = usedGiftPackages.find((e) =>
          e.usedSaleOrder.find(
            (element) => element.orderId === item && element.userId === userId
          )
        );
        if (isExistBefore) {
          console.log(`this item is exist before : ${item}`);
          return;
        }
        const usedGiftPackage = usedGiftPackages.find((giftItem) =>
          giftItem.saleOrders.find((so) => {
            return so.orderId === item;
          })
        );
        if (usedGiftPackage) {
          await GiftPackage.update(
            { id: usedGiftPackage.id },
            {
              usedSaleOrder: usedGiftPackage.usedSaleOrder.concat({
                orderId: item,
                userId
              })
            }
          );
        }
      }
    }
  }

  async onEditUserGiftPackage(dto: EditUserGiftPackageProcessorDTO) {
    try {
      await this.updateGiftPackageStatus(dto.id, GiftPackageStatus.Process);
      await this.addOrDeleteGiftPackage(dto);
      await this.updateGiftPackageStatus(dto.id, GiftPackageStatus.Success);
      this.eventEmitter.emitAsync(EventsConstant.CLIENT_REMOTE, {
        key: PermissionKey.BASE_GIFT_PACKAGE,
        type: EventsConstant.UPDATE_PACKAGE_DATA,
        payload: { success: true }
      });
    } catch (error) {
      console.log(error);
      await this.updateGiftPackageStatus(
        dto.id,
        GiftPackageStatus.Failed,
        error.message
      );
      this.eventEmitter.emit(EventsConstant.CLIENT_REMOTE, {
        key: PermissionKey.BASE_GIFT_PACKAGE,
        type: EventsConstant.UPDATE_PACKAGE_DATA,
        payload: { success: false }
      });
    }
  }

  // transformers

  transformOrderType(giftType: ProductType): SaleUnitType {
    switch (giftType) {
      case ProductType.Credit:
        return SaleUnitType.Credit;
      case ProductType.Service:
        return SaleUnitType.Service;
      default:
        return undefined;
    }
  }

  transformUsedSaleItem(saleItems: SaleItem[]) {
    return saleItems
      .filter((item) => item.usedCredit !== 0 && item.isGift)
      .map((saleItem) => saleItem.id);
  }
}
