import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductType } from '../automation/base/entities/ProductCategory';
import { SaleItem } from '../automation/operational/entities/SaleItem';
import { SaleOrder } from '../automation/operational/entities/SaleOrder';
import { User } from '../base/entities/User';
import { EventsConstant } from '../common/constant/events.constant';
import {
  _priceFormat,
  _formatDate,
  _concatName
} from '../common/helper/formatter.helper';
import {
  NotificationTemplateDTO,
  NotificationMessageTemplate
} from '../notification/NotificationService';
import JalaliMoment from 'moment-jalaali';
import { SaleUnitType } from '../automation/operational/entities/SaleItem';


@Injectable()
export class SmsSaleOrderService {
  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;

  async sendSms(order: SaleOrder) {
    if (order) {
      if (order && !Array.isArray(order) && !order?.isGift) {
        await this._sendingItemSms(order, order?.items);
        return;
      }

      if (order && !Array.isArray(order) && order?.isGift) {
        await this._sendingGiftPackageSms(order);
        return;
      }
    }
  }

  private async _sendingGiftPackageSms(order: SaleOrder) {
    order?.items?.map(async (item) => {
      const user = await User.findOne({ where: { id: item.user.id } });
      const smsTemplate: NotificationTemplateDTO = {
        templateName: NotificationMessageTemplate.GiftPackageTemplate,
        mobile: user.mobile,
        email: user.email,
        tokens: {
          customer_name: user.firstName.concat(' ', user.lastName),
          name: item?.product?.title,
          id: item.id,
          expired_at: JalaliMoment(item.end).format('jYYYY/jMM/jDD'),
          good_luck_msg: 'موفق باشید'
        }
      };
      await this.eventEmitter.emitAsync(
        EventsConstant.SMS_NOTIFICATION,
        smsTemplate
      );
      return;
    });
  }

  private async _sendingCreditSms(
    order: SaleOrder,
    item: SaleItem,
    user: User
  ) {
    const smsTemplate: NotificationTemplateDTO = {
      templateName: NotificationMessageTemplate.BuyServiceTemplateCharge,
      mobile: user.mobile,
      email: user.email,
      tokens: {
        customer_name: user.firstName.concat(' ', user.lastName),
        name: item?.product?.title,
        id: item.id,
        expired_at: JalaliMoment(item.end).format('jYYYY/jMM/jDD'),
        credit_value: _priceFormat(item.credit, 'fa')
      }
    };
    await this.eventEmitter.emitAsync(
      EventsConstant.SMS_NOTIFICATION,
      smsTemplate
    );
  }

  private async _sendingServiceSms(
    order: SaleOrder,
    item: SaleItem,
    user: User
  ) {
    if (!item?.product?.includeSms) return;
    const smsTemplate: NotificationTemplateDTO = {
      templateName: (item?.product?.defaultSmsTemplate ||
        NotificationMessageTemplate.BuyServiceTemplateSession) as any,
      customTemplate: !!item?.product?.defaultSmsTemplate,
      mobile: user.mobile,
      email: user.email,
      tokens: {
        customer_name: user.firstName.concat(' ', user.lastName),
        name: item?.product?.title,
        id: item.id,
        expired_at: JalaliMoment(item.end).format('jYYYY/jMM/jDD'),
        credit_value: item.credit
      }
    };
    await this.eventEmitter.emitAsync(
      EventsConstant.SMS_NOTIFICATION,
      smsTemplate
    );

    if (item.contractor) {
      const smsTemplate: NotificationTemplateDTO = {
        templateName:
          NotificationMessageTemplate.ContractorRegisteredServiceTemplate,
        mobile: item.contractor.mobile,
        email: item.contractor.email,
        tokens: {
          customer_name: item?.contractor?.firstName?.concat(
            ' ',
            item?.contractor?.lastName
          ),
          service_name: item?.product?.title,
          start_date: _formatDate(item?.start),
          end_date: _formatDate(item?.end),
          amount: item.credit
        }
      };
      await this.eventEmitter.emitAsync(
        EventsConstant.SMS_NOTIFICATION,
        smsTemplate
      );
    }
  }

  private async _sendingProductSms(
    order: SaleOrder,
    item: SaleItem,
    user: User
  ) {
    const smsTemplate: NotificationTemplateDTO = {
      templateName: NotificationMessageTemplate.FactoryTemplate,
      mobile: user.mobile,
      email: user.email,
      tokens: {
        customer_name: _concatName(user.firstName, user.lastName),
        shop_name: item.saleUnit?.title,
        date: JalaliMoment(order.submitAt).format('jYYYY/jMM/jDD'),
        price: _priceFormat(order.totalAmount, 'fa')
      }
    };
    await this.eventEmitter.emitAsync(
      EventsConstant.SMS_NOTIFICATION,
      smsTemplate
    );
  }

  private async _sendingReceptionSms(
    order: SaleOrder,
    item: SaleItem,
    user: User
  ) {
    console.log('------------- reception -------------------');

    let smsTemplate: any;
    if (!item?.product?.includeSms) return;
    if (item?.registeredService) {
      const remainAmount =
        item.registeredService.credit - item.registeredService.usedCredit;
      smsTemplate = {
        templateName:
          item?.product?.type === ProductType.Service
            ? NotificationMessageTemplate.UseSessionServiceTemplate
            : NotificationMessageTemplate.UseServiceChargeTemplate,
        mobile: user.mobile,
        email: user.email,
        tokens: {
          customer_name: user.firstName.concat(' ', user.lastName),
          service_name: item.product?.title,
          session_number: item.quantity,
          remain_amount:
            remainAmount < 0 ? 0 : _priceFormat(remainAmount, 'fa'),
          credit_value: remainAmount < 0 ? 0 : remainAmount,
          date: JalaliMoment().format('jYYYY/jMM/jDD'),
          price: item.registeredService.price * item.registeredService.quantity,
          expired_at: JalaliMoment(item.registeredService.end).format(
            'jYYYY/jMM/jDD'
          )
        }
      };
    } else {
      smsTemplate = {
        templateName:
          item.product?.type === ProductType.Service
            ? NotificationMessageTemplate.UseSessionServiceTemplate
            : NotificationMessageTemplate.UseServiceChargeTemplate,
        mobile: user.mobile,
        email: user.email,

        tokens: {
          customer_name: user.firstName.concat(' ', user.lastName),
          service_name: item.product?.title,
          session_number: item?.quantity,
          remain_amount: 0,
          credit_value: 0,
          date: JalaliMoment().format('jYYYY/jMM/jDD'),
          price: item.price,
          expired_at: JalaliMoment().format('jYYYY/jMM/jDD')
        }
      };
    }

    await this.eventEmitter.emitAsync(
      EventsConstant.SMS_NOTIFICATION,
      smsTemplate
    );

    if (item?.contractor) {
      const contractor = await User.findOne({
        where: { id: item?.contractor?.id }
      });
      if (contractor) {
        const smsTemplate: NotificationTemplateDTO = {
          templateName:
            NotificationMessageTemplate.SaveServiceContractorsTemplate,
          mobile: contractor.mobile,
          email: contractor.email,
          tokens: {
            customer_name: _concatName(
              order.user?.firstName,
              order.user?.lastName
            ),
            service_name: item.product?.title,
            decrease_session: item.quantity,
            expired_date: _formatDate(
              item.registeredService?.end || new Date()
            ),
            remain_session: item.registeredService
              ? item.registeredService.credit -
                item.registeredService.usedCredit
              : 0
          }
        };
        await this.eventEmitter.emitAsync(
          EventsConstant.SMS_NOTIFICATION,
          smsTemplate
        );
      }
    }
  }

  async _sendReserveSms(item: SaleItem, user: User) {
    const smsTemplate: NotificationTemplateDTO = {
      templateName: NotificationMessageTemplate.ReserveTemplate,
      mobile: user.mobile,
      email: user.email,
      tokens: {
        customer_name: user.firstName.concat(' ', user.lastName),
        reserve_at: _formatDate(new Date(item?.reservedDate)),
        start_at: item.reservedStartTime,
        end_at: item.reservedEndTime,
        id: item.id,
        name: item?.product?.title
      }
    };
    await this.eventEmitter.emitAsync(
      EventsConstant.SMS_NOTIFICATION,
      smsTemplate
    );
  }

  private _sendingItemSms(order: SaleOrder, items: SaleItem[]) {
    return items?.map(async (item) => {
      const user = await User.findOne({ where: { id: item?.user?.id } });
      if (item.isCashBack) {
        return;
      }
      if (item.isReserve) {
        this._sendReserveSms(item, user);
        return;
      }
      switch (item.type) {
        case SaleUnitType.Credit: {
          await this._sendingCreditSms(order, item, user);
          return;
        }
        case SaleUnitType.Service: {
          console.log(123, item.product?.includeSms);
          await this._sendingServiceSms(order, item, user);
          return;
        }
        case SaleUnitType.Package: {
          return;
        }
        case SaleUnitType.Product: {
          await this._sendingProductSms(order, item, user);
          return;
        }
        case SaleUnitType.Reception: {
          await this._sendingReceptionSms(order, item, user);
          return;
        }
      }
    });
  }
}
