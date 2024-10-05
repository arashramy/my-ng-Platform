import { BadRequestException, Injectable } from '@nestjs/common';
import { Gender, Role, User, UserStatus } from '../../base/entities/User';
import { Permission } from '../../base/entities/Permission';
import { In, IsNull, MoreThanOrEqual, Not } from 'typeorm';
import { HashHelper } from '../../common/helper/hash.helper';
import { UpdateUserDto } from '../dto/UpdateUser.dto';
import Redis from 'ioredis';
import {
  DEFAULT_REDIS_NAMESPACE,
  RedisService
} from '@liaoliaots/nestjs-redis';
import { ImageUploader } from '../../image-hub/decorators/image-uploader.decorator';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  RegisteredServiceStatus,
  SaleItem
} from '../../automation/operational/entities/SaleItem';
import { SaleUnit, } from '../../base/entities/SaleUnit';
import { ReceptionLocker } from '../../automation/operational/entities/ReceptionLocker';
import { LockerItem } from '../../automation/operational/entities/LockerItem';
import { UserCreatedSmsNotif } from '../decorators/user-created-sms-notif.decorator';
import { Bank } from '../../base/entities/Bank';
import { FiscalYear } from '../../base/entities/FiscalYears';
import { OrganizationUnit } from '../../base/entities/OrganizationUnit';
import { WorkGroup } from '../../base/entities/WorkGroup';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SaleUnitType } from '../../automation/operational/entities/SaleItem';

@Injectable()
export class UsersService {
  static USER_STORE_KEY = 'USER_STORE_KEY_';
  redis: Redis;

  constructor(
    private readonly redisService: RedisService,
    public readonly eventEmitter: EventEmitter2,
    @InjectQueue('happy-birthday') public happyBirthdayQueue: Queue
  ) {
    this.redis = this.redisService.getClient(DEFAULT_REDIS_NAMESPACE);
  }

  async get(key: any, field = 'id', relations: string[] = []) {
    let data: any = await this.redis.get(
      `${UsersService.USER_STORE_KEY}${field}_${key}`
    );
    if (!data) {
      data = await User.findOne({
        where: { [field]: key },
        relations: relations
      });
      if (data) {
        await this.set(key, data, field);
      }
      return data;
    } else {
      return JSON.parse(data) as User;
    }
  }

  async set(key: any, user: User, field = 'id') {
    try {
      await this.redis.set(
        `${UsersService.USER_STORE_KEY}${field}_${key}`,
        JSON.stringify(user),
        'EX',
        3600
      );
    } catch (e) {
      console.error(e);
    }
  }

  async del(key: any, field = 'id') {
    await this.redis.del(`${UsersService.USER_STORE_KEY}${field}_${key}`);
  }

  async delCache(id: number) {
    let user = await this.findOne(id);
    if (user) {
      await this.del(user.id, 'id');
      await this.del(user.mobile, 'mobile');
      await this.del(user.code, 'code');
    }
  }

  @UserCreatedSmsNotif
  async crearteUserAndAssignEssentialEntity(model: any, current: User) {
    const entity = new User();
    for (const key of Object.keys(model)) {
      if (key == 'password') {
        if (model[key] && model[key] != '')
          entity.password = await HashHelper.hash(model.password);
      } else if (key === 'groups') {
        const groupId = model.groups?.map((g) => g.id);
        if (groupId?.length) {
          entity.groups = await WorkGroup.findBy({ id: In(groupId) });
        } else {
          entity.groups = [];
        }
      } else if (key === 'accessFiscalYears') {
        const fiscalIds = model.accessFiscalYears?.map((g) => g.id);
        if (fiscalIds?.length) {
          entity.accessFiscalYears = await FiscalYear.findBy({
            id: In(fiscalIds)
          });
        } else {
          entity.accessFiscalYears = [];
        }
      } else if (key === 'accessOrganizationUnits') {
        let orgIds = model.accessOrganizationUnits?.map((g) => g.id);
        if (orgIds?.length) {
          entity.accessOrganizationUnits = await OrganizationUnit.findBy({
            id: In(orgIds)
          });
        } else {
          entity.accessOrganizationUnits = [];
        }
      } else if (key === 'accessShops') {
        const shopIds = model.accessShops?.map((g) => g.id);
        if (shopIds?.length) {
          entity.accessShops = await SaleUnit.findBy({ id: In(shopIds) });
        } else {
          entity.accessShops = [];
        }
      } else if (key === 'accessBanks') {
        const banksId = model.accessBanks?.map((g) => g.id);
        if (banksId?.length) {
          entity.accessBanks = await Bank.findBy({ id: In(banksId) });
        } else {
          entity.accessBanks = [];
        }
      } else {
        entity[key] = model[key];
      }
    }
    entity.createdBy = current;
    return this.create(entity);
  }

  @ImageUploader()
  async create(user: User) {
    if (user.code) {
      const userExistByCode = await this.findByCode(user.code);
      if (userExistByCode) {
        throw new BadRequestException('User exist By This Code');
      }
    } else {
      user.code = (await this.getLastCode()) + 1;
    }
    if (!user.roles || user.roles.length == 0) {
      user.roles = [Role.Membership];
    }
    if (!user.password) {
      user.password = await HashHelper.hash(user.mobile);
    } else {
      // user.password = await HashHelper.hash(user.password);
    }
    if (user.status == undefined) {
      user.status = UserStatus.enabled;
    }
    if (user.authorizedDebtor == undefined) {
      user.authorizedDebtor = false;
    }
    if (
      (await User.countBy(
        user.mobile ? { mobile: user.mobile } : { email: user.email }
      )) > 0
    ) {
      throw new BadRequestException('Exist user by this mobile number');
    }
    user.credit = 0;
    return User.save(user);
  }

  async getLastCode() {
    return (
      (
        await User.findOne({
          where: { code: Not(IsNull()) },
          order: { code: 'DESC' },
          withDeleted: true
        })
      ).code || 0
    );
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await User.update(id, updateUserDto);
    await this.delCache(id);
  }

  async getUserPermissions(user: User) {
    return Permission.find({
      where: { group: In(user.groups.map((g) => g.id)) },
      cache: false
    });
  }

  async findOne(id: number) {
    return this.get(id, 'id', ['groups']);
  }

  async findByUsername(username: string) {
    return this.get(username, 'mobile', [
      'groups',
      'accessOrganizationUnits',
      'accessFiscalYears',
      'accessShops',
      'accessShops.defaultCustomer',
      'accessShops.defaultBank',
      'accessShops.lockerLocation',
      'accessShops.defaultBank.pos',
      'accessBanks',
      'schedules'
    ]);
  }

  async findByEmail(email: string) {
    return this.get(email, 'email', [
      'groups',
      'accessOrganizationUnits',
      'accessFiscalYears',
      'accessShops',
      'accessShops.defaultCustomer',
      'accessShops.defaultBank',
      'accessShops.lockerLocation',
      'accessShops.defaultBank.pos',
      'accessBanks',
      'schedules'
    ]);
  }

  findByCode(code: number) {
    return this.get(code, 'code', []);
  }

  async findContractor(id: number) {
    const user = await User.findOne({ where: { id } });
    console.log(user.isContractor());
    // let user = (await this.findOne(id)) as User;
    if (user && user.isContractor()) {
      return user;
    }
    return null;
  }

  async findMembership(id: number) {
    let user = (await this.findOne(id)) as User;
    if (user && user.roles?.includes(Role.Membership)) {
      return user;
    }
    return null;
  }

  async createDefaultUser() {
    let count = await User.createQueryBuilder()
      .andWhere("user_roles::jsonb ? 'Admin'")
      .getCount();
    if (count == 0) {
      const defaultPassword = '123@asd';
      let admin1 = new User();
      admin1.roles = [Role.Admin];
      admin1.firstName = 'ادمین';
      admin1.code = 1;
      admin1.lastName = '1';
      admin1.mobile = '09370097616';
      admin1.status = UserStatus.enabled;
      admin1.gender = Gender.Male;
      admin1.password = await HashHelper.hash(defaultPassword);
      await User.save(admin1);

      let admin2 = new User();
      admin2.roles = [Role.Admin];
      admin2.firstName = 'ادمین';
      admin2.code = 2;
      admin2.lastName = '2';
      admin2.mobile = '09123253471';
      admin2.status = UserStatus.enabled;
      admin2.gender = Gender.Male;
      admin2.password = await HashHelper.hash(defaultPassword);
      await User.save(admin2);

      let admin3 = new User();
      admin3.roles = [Role.Admin];
      admin3.firstName = 'کیومرث';
      admin3.code = 3;
      admin3.lastName = 'میرحسینی';
      admin3.mobile = '09128594974';
      admin3.status = UserStatus.enabled;
      admin3.gender = Gender.Male;
      admin3.password = await HashHelper.hash(defaultPassword);
      await User.save(admin3);
    }
  }

  async sendHappyBirthday(userIds: number[]): Promise<boolean> {
    try {
      const users = await User.find({
        where: { id: In(userIds) }
      });
      users.forEach((user) => {
        this.happyBirthdayQueue.add({ user });
      });
      return true;
    } catch (err) {
      console.log({ err });
      return false;
    }
  }

  // insurance, vip locker, valid registered service, credit
  async getUserInfo(
    userId: number,
    services?: SaleItem[],
    newOrderCreated?: number
  ) {
    const newUserUpdated = await User.findOne({
      where: { id: userId },
      relations: { userDescriptions: { saleUnit: true } }
    });

    const vipLocker = await SaleItem.findOne({
      where: {
        user: { id: newUserUpdated.id },
        status: RegisteredServiceStatus.opened,
        type: SaleUnitType.Service,
        end: MoreThanOrEqual(new Date()),
        product: {
          isLocker: true
        }
      },
      relations: { locker: true, product: true }
    });

    const receptionLocker = await ReceptionLocker.find({
      where: {
        reception: {
          user: { id: newUserUpdated.id },
          end: IsNull()
        }
      },

      relations: ['reception', 'reception.user']
    });
    const lockers = [];
    if (receptionLocker.length > 0) {
      for (let item of receptionLocker) {
        const locker = await LockerItem.find({
          where: {
            lockerNumber: item.locker
          },
          relations: ['locker']
        });
        const lockerExist = locker.filter((e) => e.locker !== null);
        lockers.push(lockerExist[0]);
      }
    }

    const insuranceInfo = await SaleItem.findOne({
      where: {
        user: { id: newUserUpdated.id },
        status: RegisteredServiceStatus.opened,
        type: SaleUnitType.Service,
        end: MoreThanOrEqual(new Date()),
        product: {
          isInsuranceService: true
        }
      },
      relations: { product: true }
    });

    const subscriptionInfo = await SaleItem.findOne({
      where: {
        user: { id: userId },
        product: { isSubscriptionService: true },
        end: MoreThanOrEqual(new Date()),
        status: RegisteredServiceStatus.opened
      },
      order: { createdAt: -1 },
      relations: { product: true }
    });
    return {
      lockers: lockers.map((e) => e),
      subscriptionInfo: !subscriptionInfo?.end
        ? undefined
        : {
            end: subscriptionInfo?.end,
            alarms: subscriptionInfo?.product?.alarms
          },
      user: newUserUpdated,
      services: services.map((service) => ({
        ...service,
        isNew: service.product?.id === newOrderCreated
      })),
      vipLocker: vipLocker
        ? {
            end: vipLocker?.end,
            lockerNumber: vipLocker?.locker?.lockerNumber,
            alarms: vipLocker?.product?.alarms
          }
        : undefined,
      insuranceInfo: insuranceInfo
        ? {
            end: insuranceInfo?.end,
            alarms: insuranceInfo?.product?.alarms
          }
        : undefined
    };
  }
}
