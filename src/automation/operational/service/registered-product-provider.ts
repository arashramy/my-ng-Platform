import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager, MoreThanOrEqual } from 'typeorm';
import { User } from '../../../base/entities/User';
import moment from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { UsersService } from '../../../auth/service/users.service';
import { ProductService } from '../../base/service/product.service';
import { SaleItemDto } from '../dto/sale-order.dto';
import { RegisteredServiceStatus, SaleItem } from '../entities/SaleItem';
import { SaleUnit,  } from '../../../base/entities/SaleUnit';
import { ProductPrice } from '../../base/entities/ProductPrice';
import { ContractorService } from '../../base/service/contractor.service';
import { Product } from '../../base/entities/Product';
import { ProductCategory } from '../../base/entities/ProductCategory';
import { GroupClassRoom } from '../../base/entities/GroupClassRoom';
import { ServiceReservationTime } from '../entities/ServiceReservationTime';
import { LockerItem, LockerType } from '../entities/LockerItem';
import { UserActivityService } from './user-activity.service';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';


@Injectable()
export class RegisteredProductProvider {
  constructor(
    private userService: UsersService,
    private productService: ProductService,
    private contractorService: ContractorService,
    private readonly userActivityService: UserActivityService
  ) {}

  async upsert(
    dto: SaleItemDto,
    item: SaleItem,
    product: Product,
    saleUnit: SaleUnit,
    current: User,
    manager: EntityManager
  ) {
    console.log('called37');
    let serviceItem: SaleItem = item;
    if (!item) {
      serviceItem = new SaleItem();
      if (dto.isReserve) {
        serviceItem.reservedEndTime = dto.reservedEndTime;
        serviceItem.reservedStartTime = dto.reservedStartTime;
        serviceItem.reservedDate = dto.reservedDate;
      }
      serviceItem.isOnline = dto.isOnline;
      serviceItem.type = SaleUnitType.Service;
      serviceItem.product = product;
      serviceItem.title = product.title;
      serviceItem.saleUnit = saleUnit;
      serviceItem.category = { id: product.categoryId } as ProductCategory;
      serviceItem.manualPrice = product.manualPrice;
      serviceItem.isTransfer = !!dto.isTransfer;
      serviceItem.isReserve = !!dto?.isReserve;
      serviceItem.isCashBack = !!dto.isCashBack;
      serviceItem.isGift = !!dto.isGift;
      serviceItem.returnCredit = 0;
      serviceItem.status = RegisteredServiceStatus.opened;
      serviceItem.tax = product.tax || 0;
      serviceItem.createdBy = current;
      serviceItem.withGuest = product.withGuest;
      serviceItem.usedCredit = 0;
      serviceItem.submitAt = dto.submitAt;
      serviceItem.related = product.related;
      serviceItem.unlimited = product.unlimited;
      serviceItem.persons = 0;
      serviceItem.description = dto.description;
      serviceItem.isPaymentContractor = dto.isPaymentContractor;
      serviceItem.defaultDiscount = product.discount || 0;
      if (serviceItem.unlimited) {
        serviceItem.withGuest = false;
      }
      if (serviceItem.isReserve) {
        serviceItem.tax = dto.tax || 0;
      }
    }
    // serviceItem.description = dto.description;
    console.log(
      'contractor service item',
      serviceItem?.contractor,
      dto?.contractor
    );
    if (dto.unFairPenaltyQuantity) {
      serviceItem.unFairPenaltyQuantity = dto.unFairPenaltyQuantity;
    }

    if (dto.groupClassRoom) {
      serviceItem.groupClassRoom = await GroupClassRoom.findOne({
        where: { id: dto.groupClassRoom },
        relations: ['schedules']
      });
      if (!serviceItem.groupClassRoom) {
        throw new BadRequestException('Invalid end group class room');
      }
      // !FIX
      serviceItem.contractor = {
        id: dto.contractor
      } as User;
      if (serviceItem.groupClassRoom?.fixed) {
        serviceItem.reservationTimes =
          serviceItem.groupClassRoom?.schedules?.map(
            (t) =>
              ({
                status: 0,
                date: t.date,
                from: t.from,
                to: t.to
              } as ServiceReservationTime)
          );
      }
      serviceItem.groupClassRoomIncrement = 1;
    } else {
      if (serviceItem.usedCredit == 0 || serviceItem.unlimited) {
        if (
          product?.hasContractor &&
          dto.contractor &&
          dto.contractor != serviceItem.contractorId
        ) {
          try {
            serviceItem.contractor = await this.userService.findContractor(
              dto.contractor
            );
            if (!serviceItem.contractor) {
              throw new BadRequestException('Contractor not found');
            }
          } catch (error) {
            console.log('error', error);
            throw new BadRequestException('Contractor not found');
          }
        }
      }
    }

    if (!dto.start) {
      if (!serviceItem.start) serviceItem.start = dto.submitAt;
    } else {
      let start = moment(dto.start, AppConstant.DATE_FORMAT);
      if (moment(serviceItem.submitAt).isAfter(start, 'date')) {
        throw new BadRequestException('Invalid start date');
      }
      serviceItem.start = start.toDate();
    }
    if (dto.end) {
      serviceItem.end = moment(dto.end, AppConstant.DATE_FORMAT)
        .utc(true)
        .toDate();
    }
    if (moment(serviceItem.start).isAfter(moment(serviceItem.end), 'date')) {
      throw new BadRequestException('Invalid end date');
    }
    if (serviceItem.usedCredit == 0) {
      if (saleUnit.allowDiscount || dto.parent)
        serviceItem.discount = dto.discount || 0;
      else serviceItem.discount = product.discount || 0;
    }
    console.log('product is cash back', dto.isCashBack);
    if (
      !serviceItem.isTransfer &&
      !serviceItem.isGift &&
      !serviceItem.isCashBack &&
      !serviceItem.isReserve
    ) {
      if (serviceItem.usedCredit == 0) {
        let pricePolicy: ProductPrice;
        if (serviceItem.groupClassRoom) {
          serviceItem.amount = serviceItem.groupClassRoom.price;
          serviceItem.price = Math.floor(
            serviceItem.groupClassRoom.price /
              serviceItem.groupClassRoom.sessions
          );

          if (product.hasPriceList) {
            if (product.priceList?.length) {
              if (dto.priceId) {
                pricePolicy = product.priceList?.find(
                  (p) => p.id == dto.priceId
                );
              }
            } else {
              if (dto.priceId) {
                pricePolicy = await this.productService.findPriceById(
                  product.id,
                  dto.priceId,
                  manager
                );
              }
            }
            if (!pricePolicy) {
              console.log('157');
              throw new BadRequestException('Not found service price');
            }
            serviceItem.priceId = pricePolicy.id;
            serviceItem.amount = pricePolicy.price;
            if (product.isLocker || product.unlimited) {
              serviceItem.price = pricePolicy.price;
            } else {
              serviceItem.price = Math.floor(
                pricePolicy.price / pricePolicy.min
              );
            }
          }

          serviceItem.credit = serviceItem.groupClassRoom.sessions;
          serviceItem.quantity = 1;
          serviceItem.duration = serviceItem.groupClassRoom.durations;
        } else {
          if (product.hasPriceList) {
            if (product.priceList?.length) {
              if (dto.priceId) {
                pricePolicy = product.priceList?.find(
                  (p) => p.id == dto.priceId
                );
              }
            } else {
              if (dto.priceId) {
                pricePolicy = await this.productService.findPriceById(
                  product.id,
                  dto.priceId,
                  manager
                );
              }
            }
            if (!pricePolicy) {
              throw new BadRequestException('Not found service price');
            }
            serviceItem.priceId = pricePolicy.id;
            serviceItem.amount = pricePolicy.price;
            if (product.isLocker || product.unlimited) {
              serviceItem.price = pricePolicy.price;
            } else {
              serviceItem.price = Math.floor(
                pricePolicy.price / pricePolicy.min
              );
            }
          } else {
            serviceItem.price = product.price;
            serviceItem.amount = serviceItem.price;
          }

          if (product.isLocker) {
            serviceItem.quantity = 1;
            if (!dto.locker) {
              throw new BadRequestException('Invalid locker');
            }
          } else {
            if (serviceItem.unlimited) {
              serviceItem.quantity = 1;
            } else {
              serviceItem.quantity = pricePolicy ? 1 : dto.quantity;
            }
            if (!serviceItem.quantity) {
              throw new BadRequestException('Not found quantity of sessions');
            }
          }
          serviceItem.duration = dto.parent
            ? dto.duration
            : pricePolicy?.duration || product.duration || 0;
        }
        if (!serviceItem.end) {
          serviceItem.end = moment(serviceItem.start)
            .add(serviceItem.duration, 'days')
            .toDate();
        }
        serviceItem.credit = pricePolicy?.min || serviceItem.quantity;
      }
    } else {
      if (dto.isReserve) {
        serviceItem.credit = dto.credit;
        serviceItem.usedCredit = 0;
        serviceItem.price = dto.price;
        serviceItem.amount = dto.price;

        console.log('service items', serviceItem);
      } else {
        serviceItem.credit = dto.credit;
        serviceItem.usedCredit = dto.usedCredit || 0;
        serviceItem.price = Math.floor(dto.price / dto.credit);
        serviceItem.amount = dto.price;
      }
    }
    if (serviceItem.unlimited) {
      serviceItem.credit = dto.amount;
    }
    if (product.isLocker) {
      if (
        (dto.locker || 0) !==
        (serviceItem.lockerId || serviceItem.locker?.id || 0)
      ) {
        let locker = await LockerItem.findOneBy({
          id: dto.locker,
          type: LockerType.vip
        });
        if (!locker) {
          throw new BadRequestException('Not found locker');
        }
        if (!locker.status) {
          throw new BadRequestException('Locker is disabled');
        }
        serviceItem.locker = locker;
        const oldItem = await manager.find(SaleItem, {
          where: {
            locker: { id: dto.locker },
            end: MoreThanOrEqual(serviceItem.end)
          },
          order: { end: 'DESC' },
          take: 1
        });
        if (oldItem?.length) {
          const start = moment(oldItem[0].start).add(1, 'day');
          serviceItem.start = start.toDate();
          serviceItem.end = start
            .clone()
            .add(serviceItem.duration, 'day')
            .toDate();
        }
        serviceItem.title = `${product.title}(${serviceItem.locker?.lockerNumber})`;
      }
    }
    if (
      serviceItem.isTransfer ||
      (serviceItem.isReserve && !serviceItem.quantity)
    ) {
      serviceItem.quantity = 1;
    }

    // if (serviceItem.totalAmount < 0) {
    //   throw new BadRequestException('Amount is zero');
    // }
    serviceItem.contractorIncomes = [];
    console.log('condiotm', product.hasContractor, serviceItem.contractor);
    if (product.hasContractor && serviceItem.contractor) {
      const isEdit = await this.contractorService.checkIsEditContractorIncomes(
        item,
        dto,
        current,
        manager
      );
      console.log('isEdit327', isEdit);
      const ci = await this.contractorService.processContractorIncome(
        serviceItem,
        product,
        current,
        manager,
        isEdit
      );
      if (ci) serviceItem.contractorIncomes.push(ci);
    }
    if (product.hasPartner) {
      const pcl = await this.contractorService.processPartnerIncome(
        serviceItem,
        product,
        current,
        manager
      );
      if (pcl?.length) {
        serviceItem.contractorIncomes = [
          ...pcl,
          ...serviceItem.contractorIncomes
        ];
      }
    }
    return serviceItem;
  }
}
