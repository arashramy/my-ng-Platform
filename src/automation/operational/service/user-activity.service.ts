import { Injectable } from '@nestjs/common';
import { Setting, SettingKey } from '../../../base/entities/Setting';
import { User } from '../../../base/entities/User';
import { RegisteredServiceStatus } from '../entities/SaleItem';
import { In, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import moment from 'moment';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SaleUnitType } from '../../../automation/operational/entities/SaleItem';

@Injectable()
export class UserActivityService {
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async checkUserActivity() {
    const setting = await Setting.findByKey(SettingKey.ActivitySetting);
    let usersId: number[] = [];

    const regUserActivity = await this.registeredServiceActivity(
      setting,
      false,
      null
    );

    if (regUserActivity && regUserActivity.length > 0) {
      usersId = usersId.concat(regUserActivity);
    }

    const insuranceActivity = await this.insuranceActivity(setting, false);
    if (insuranceActivity && insuranceActivity.length > 0) {
      usersId = usersId.concat(insuranceActivity);
    }

    const subscriptionActivity = await this.subscriptionActivity(
      setting,
      false
    );
    if (subscriptionActivity && subscriptionActivity.length > 0) {
      usersId = usersId.concat(subscriptionActivity);
    }

    const chargingServiceActivity = await this.chargingServiceActivity(
      setting,
      false
    );
    if (chargingServiceActivity.length > 0 && chargingServiceActivity) {
      usersId = usersId.concat(chargingServiceActivity);
    }

    const creditActivity = await this.creditActivity(setting, false);
    if (creditActivity && creditActivity.length > 0) {
      usersId = usersId.concat(creditActivity);
    }

    const insuranceUsersActivity = await this.insuranceUser(setting, false);
    if (insuranceActivity && insuranceUsersActivity.length > 0) {
      usersId = usersId.concat(insuranceUsersActivity);
    }

    const users = [...new Set(usersId)];

    if (users.length > 0) {
      try {
        await User.update([...new Set(usersId)], { hasActivity: true });
        await User.update(
          { id: Not(In([...new Set(usersId)])) },
          { hasActivity: false }
        );
      } catch (error) {}
    } else {
      try {
        await User.update({ hasActivity: true }, { hasActivity: false });
      } catch (error) {}
    }
  }

  async registeredServiceActivity(
    setting: any,
    update: boolean,
    userId: number
  ) {
    const today = moment().format('YYYY/MM/DD');
    let userIds = [];
    if (!setting) {
      setting = await Setting.findByKey(SettingKey.ActivitySetting);
    }
    if (setting?.hasRegisteredService) {
      const users = await User.find({
        where: {
          saleItems: {
            status: RegisteredServiceStatus.opened,
            type: SaleUnitType.Service,
            end: MoreThanOrEqual(today as any),
            start: LessThanOrEqual(today as any),
            product: {
              isLocker: false,
              isInsuranceService: false,
              isSubscriptionService: false
            },
            related: false
          }
        },
        relations: ['saleItems']
      });
      userIds = users.map((e) => e.id);
    }
    if (userId) {
      userIds.push(userId);
    }

    if (
      setting?.hasRegisteredService &&
      update &&
      userIds &&
      userIds.length > 0
    ) {
      await User.update([...new Set(userIds)], { hasActivity: true });
      await User.update(
        { id: Not(In([...new Set(userIds)])) },
        { hasActivity: false }
      );
    } else if (setting?.hasRegisteredService && update) {
      await User.update(
        { id: Not(In([...new Set(userIds)])) },
        { hasActivity: false }
      );
    } else {
      return userIds;
    }
  }

  async insuranceActivity(setting: any, update: boolean) {
    const today = moment().format('YYYY/MM/DD');
    let userIds = [];
    if (!setting) {
      setting = await Setting.findByKey(SettingKey.ActivitySetting);
    }
    if (setting?.hasInsurance) {
      const users = await User.find({
        where: {
          saleItems: {
            status: RegisteredServiceStatus.opened,
            type: SaleUnitType.Service,
            end: MoreThanOrEqual(today as any),
            start: LessThanOrEqual(today as any),
            product: {
              isLocker: false,
              isInsuranceService: true,
              isSubscriptionService: false
            },
            related: false
          }
        }
      });
      userIds = users.map((e) => e.id);
    }
    if (update && userIds && userIds.length > 0) {
      await User.update([...new Set(userIds)], { hasActivity: true });
      await User.update(
        { id: Not(In([...new Set(userIds)])) },
        { hasActivity: false }
      );
    } else if (update) {
      await User.update(
        { id: Not(In([...new Set(userIds)])) },
        { hasActivity: false }
      );
    } else {
      return userIds;
    }
  }

  async subscriptionActivity(setting: any, update: boolean) {
    const today = moment().format('YYYY/MM/DD');
    let userIds = [];
    if (!setting) {
      setting = await Setting.findByKey(SettingKey.ActivitySetting);
    }
    if (setting?.hasSubscription) {
      const users = await User.find({
        where: {
          saleItems: {
            status: RegisteredServiceStatus.opened,
            type: SaleUnitType.Service,
            end: MoreThanOrEqual(today as any),
            start: LessThanOrEqual(today as any),
            product: {
              isLocker: false,
              isInsuranceService: false,
              isSubscriptionService: true
            },
            related: false
          }
        }
      });
      userIds = users.map((e) => e.id);
    }
    if (update && userIds && userIds.length > 0) {
      await User.update([...new Set(userIds)], { hasActivity: true });
      await User.update(
        { id: Not(In([...new Set(userIds)])) },
        { hasActivity: false }
      );
    } else if (update) {
      await User.update(
        { id: Not(In([...new Set(userIds)])) },
        { hasActivity: false }
      );
    } else {
      return userIds;
    }
  }

  async chargingServiceActivity(setting: any, update: boolean) {
    const today = moment().format('YYYY/MM/DD');
    let userIds = [];
    if (!setting) {
      setting = await Setting.findByKey(SettingKey.ActivitySetting);
    }
    if (setting?.hasChargingService) {
      const users = await User.find({
        where: {
          saleItems: {
            type: SaleUnitType.Credit,
            end: MoreThanOrEqual(today as any),
            start: LessThanOrEqual(today as any)
          }
        }
      });

      userIds = users.map((e) => e.id);
    }

    if (update && userIds && userIds.length > 0) {
      await User.update([...new Set(userIds)], { hasActivity: true });
      await User.update(
        { id: Not(In([...new Set(userIds)])) },
        { hasActivity: false }
      );
    } else if (update) {
      await User.update(
        { id: Not(In([...new Set(userIds)])) },
        { hasActivity: false }
      );
    } else {
      return userIds;
    }
  }

  async creditActivity(setting: any, update: boolean) {
    let userIds = [];
    if (!setting) {
      setting = await Setting.findByKey(SettingKey.ActivitySetting);
    }
    if (setting?.hasCredit && setting?.lessCredit) {
      const users = await User.find({
        where: { credit: MoreThanOrEqual(+setting?.lessCredit) }
      });

      userIds = users.map((e) => e.id);
    }

    if (
      setting?.hasCredit &&
      setting?.lessCredit &&
      update &&
      userIds &&
      userIds.length > 0
    ) {
      await User.update([...new Set(userIds)], { hasActivity: true });
      await User.update(
        { id: Not(In([...new Set(userIds)])) },
        { hasActivity: false }
      );
    } else if (setting?.hasCredit && setting?.lessCredit && update) {
      await User.update(
        { id: Not(In([...new Set(userIds)])) },
        { hasActivity: false }
      );
    } else {
      return userIds;
    }
  }

  async insuranceUser(setting: any, update: boolean) {
    const today = moment().format('YYYY/MM/DD');
    let userIds = [];
    if (!setting) {
      setting = await Setting.findByKey(SettingKey.ActivitySetting);
    }
    if (setting?.hasInsuranceUser) {
      const users = await User.find({
        where: {
          insuranceExpiredDate: MoreThanOrEqual(today as any)
        }
      });
      userIds = users.map((e) => e.id);
    }
    if (update && userIds && userIds.length > 0) {
      await User.update([...new Set(userIds)], { hasActivity: true });
      await User.update(
        { id: Not(In([...new Set(userIds)])) },
        { hasActivity: false }
      );
    } else if (update) {
      await User.update(
        { id: Not(In([...new Set(userIds)])) },
        { hasActivity: false }
      );
    } else {
      return userIds;
    }
  }
}
