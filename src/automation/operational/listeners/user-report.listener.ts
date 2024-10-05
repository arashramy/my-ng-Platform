import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { UsersService } from '../../../auth/service/users.service';
import { EventsConstant } from '../../../common/constant/events.constant';
import { RegisteredServiceStatus, SaleItem } from '../entities/SaleItem';
import { ProductAlarmType, } from '../../../automation/base/entities/Product';
import { In } from 'typeorm';
import moment from 'moment';
import { PermissionKey } from '../../../common/constant/auth.constant';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';


@Injectable()
export class UserReportListener {
  @Inject(UsersService) private readonly userService: UsersService;

  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;

  @OnEvent(EventsConstant.USER_DETAIL)
  async getUserDetailHandler(props) {
    const userInfo = await this.userService.getUserInfo(props.user, []);
    // console.log(userInfo);
    const services = (
      await SaleItem.find({
        where: {
          user: { id: props.user },
          status: RegisteredServiceStatus.opened,
          type: In([
            SaleUnitType.Service,
            SaleUnitType.Credit,
            SaleUnitType.Package
          ]),
          product: {
            isLocker: false,
            isInsuranceService: false,
            isSubscriptionService: false
          },
          related: false
        },
        relations: { product: true, saleOrder: true }
      })
    ).filter(
      (rgs) =>
        rgs.credit > rgs.usedCredit &&
        rgs.saleOrder?.totalAmount === rgs.saleOrder?.settleAmount
    );
    let error = false;
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      if (error) break;
      if (service?.product?.alarms?.length > 0) {
        service?.product?.alarms?.map((alarm) => {
          if (alarm.type === ProductAlarmType.expiresTimeAlarm) {
            const remainTime = moment(service?.end).diff(moment(), 'day') + 2;
            // console.log(858585, remainTime, alarm.value);
            if (remainTime <= +alarm.value) {
              console.log('send error for end');
              error = true;
            }
          } else if (alarm.type === ProductAlarmType.remainCreditAlarm) {
            const remainCredit =
              (+service.credit || 0) - (+service.usedCredit || 0);
            // console.log(22222, remainCredit, alarm.value);
            if (+remainCredit <= +alarm.value) {
              console.log('send error');
              error = true;
            }
          }
        });
      }
    }

    if (userInfo?.vipLocker) {
      const remainTime =
        moment(userInfo?.vipLocker?.end).diff(moment(), 'day') + 2;
      for (let i = 0; i < userInfo?.vipLocker?.alarms?.length; i++) {
        if (error) break;
        if (remainTime <= +userInfo?.vipLocker?.alarms?.[i]?.value) {
          console.log('send error for end vip');
          error = true;
        }
      }
    }

    if (userInfo?.insuranceInfo) {
      const remainTime =
        moment(userInfo?.insuranceInfo?.end).diff(moment(), 'day') + 2;
      for (let i = 0; i < userInfo?.insuranceInfo?.alarms?.length; i++) {
        if (error) break;
        if (remainTime <= +userInfo?.insuranceInfo?.alarms?.[i]?.value) {
          console.log('send error for end insurance info');
          error = true;
        }
      }
    }

    if (userInfo?.subscriptionInfo) {
      const remainTime =
        moment(userInfo?.subscriptionInfo?.end).diff(moment(), 'day') + 2;
      for (let i = 0; i < userInfo?.subscriptionInfo?.alarms?.length; i++) {
        if (error) break;
        if (remainTime <= +userInfo?.subscriptionInfo?.alarms?.[i]?.value) {
          console.log('send error for end subscription');
          error = true;
        }
      }
    }
    if (userInfo.user.credit < 0) {
      error = true;
    }

    if (error) {
      return this.eventEmitter.emit(EventsConstant.CLIENT_REMOTE, {
        data: {
          type: EventsConstant.CLIENT_USER_REPORT,
          user: {
            firstName: userInfo.user.firstName,
            lastName: userInfo.user.lastName,
            mobile: userInfo.user.mobile,
            credit: userInfo.user.credit,
            id: userInfo.user.id,
            profile: userInfo.user.profile
          },
          submitAt: moment().format('YYYY/MM/DD HH:mm:ss')
        },
        key: PermissionKey.BASE_USERS
      });
    }
  }
}
