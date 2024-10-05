import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Redis } from 'ioredis';
import {
  DEFAULT_REDIS_NAMESPACE,
  RedisService
} from '@liaoliaots/nestjs-redis';
import {
  AttendanceDevice,
  DeviceOperation
} from '../../base/entities/AttendanceDevice';
import { UsersService } from '../../auth/service/users.service';
import {
  DeviceSampleType,
  RemoteDevicePayload,
  RemoteDeviceProcess,
  RequestToCreateSampleDTO
} from './dtos';
import { FiscalYear } from '../../base/entities/FiscalYears';
import { IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { SaleOrder } from '../../automation/operational/entities/SaleOrder';
import { ReceptionLocker } from '../../automation/operational/entities/ReceptionLocker';
import { RemoveDeviceAdapterService } from './adapters/adapeter-abstract.service';
import { AdapterService } from './adapters/adapter.service';
import { Setting, SettingKey } from '../../base/entities/Setting';
import { ReceptionDeviceOpt } from './opt/reception.opt';
import { LockerDeviceOpt } from './opt/locker.opt';
import { ExitDeviceOpt } from './opt/exit.opt';
import {
  SaleUnitType
} from '../../automation/operational/entities/SaleItem';
import { ShopDeviceOpt } from './opt/shop.opt';
import { User } from '../../base/entities/User';
import {
  RegisteredServiceStatus,
  SaleItem
} from '../../automation/operational/entities/SaleItem';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../../common/constant/events.constant';
import {
  DeviceOperationType,
  OperationNameDevice,
  createOperationDeviceEvent
} from './device.util';
import { DeviceMessage } from './device.constant';
import moment, { invalid, now } from 'moment';
import { SaleOrderService } from '../../automation/operational/service/sale-order.service';
import { ProductType } from '../../automation/base/entities/ProductCategory';

@Injectable()
export class DeviceService {
  private redis: Redis;
  private hasActiveReception?: boolean;

  constructor(
    private readonly redisService: RedisService,
    private readonly userService: UsersService,
    private readonly adapterService: AdapterService,
    private readonly receptionDeviceOpt: ReceptionDeviceOpt,
    private readonly lockerDeviceOpt: LockerDeviceOpt,
    private readonly exitDeviceOpt: ExitDeviceOpt,
    private readonly shopDeviceOpt: ShopDeviceOpt,
    private readonly eventEmitter: EventEmitter2,
    private readonly saleOrderService: SaleOrderService
  ) {
    this.redis = this.redisService.getClient(DEFAULT_REDIS_NAMESPACE);
  }

  public async reception(
    payload: RemoteDevicePayload,
    adapter: RemoveDeviceAdapterService,
    deviceConfigUrl: string,
    type: string
  ): Promise<void> {
    console.log('called');
    try {
      const receptions = await SaleOrder.findOne({
        where: {
          user: { id: payload.user.id },
          end: IsNull(),
          reception: true
        },
        order: { createdAt: -1 },
        relations: ['user']
      });

      console.log('PAYLOAD DEVICE', payload.device, !!receptions);
      // device send reception traffic to software
      // software check sale unit has repeatble access or not
      // if it doesnt have repeatble access check the receptions
      // if receptions length are more than 1 return error
      // that you cant send message
      if (!payload.device.saleUnit.repeatableTraffic && receptions) {
        this.eventEmitter.emit(
          EventsConstant.CLIENT_REMOTE,
          createOperationDeviceEvent(
            OperationNameDevice.UNABLE_TO_RECEPTION,
            {
              user: payload.user,
              id: this.generateId(),
              type: 'action',
              message: DeviceMessage.UNABLE_TO_REPEATBALE_RECEPTION,
              receptions
            },
            DeviceOperationType.RECEPTION
          )
        );
        adapter.sendResult(deviceConfigUrl, {
          deviceCode: payload.device.deviceCode,
          message: DeviceMessage.UNABLE_TO_REPEATBALE_RECEPTION
        });
        console.log('xxxxx');
        return { message: DeviceMessage.UNABLE_TO_REPEATBALE_RECEPTION } as any;
      }

      const [lastReception] = await SaleItem.find({
        order: { createdAt: -1 },
        take: 1,
        where: { type: SaleUnitType.Reception }
      });
      const lastTimeReceptionConfig = await Setting.findByKey(
        SettingKey.IdentificationConfig
      );
      if (
        (lastReception &&
          !moment().isAfter(
            moment(lastReception?.createdAt).add(
              lastTimeReceptionConfig['delay-time'] || 5,
              'second'
            )
          )) ||
        this.hasActiveReception
      ) {
        console.log('hello world', lastReception?.id);
        this.eventEmitter.emit(
          EventsConstant.CLIENT_REMOTE,
          createOperationDeviceEvent(
            OperationNameDevice.UNABLE_TO_RECEPTION,
            {
              user: payload.user,
              id: this.generateId(),
              type: 'action'
            },
            DeviceOperationType.RECEPTION
          )
        );
        adapter.sendResult(deviceConfigUrl, {
          deviceCode: payload.device.deviceCode,
          message: DeviceMessage.UNABLE_TO_RECEPTION
        });
        return { message: DeviceMessage.UNABLE_TO_RECEPTION } as any;
      }
      const insuranceSetting = await Setting.findByKey(SettingKey.Insurance);
      const user = await User.findOne({ where: { id: payload.user.id } });

      if (insuranceSetting && insuranceSetting.checkInsurance) {
        if (!user?.nationCode) {
          // throw new BadRequestException(
          //   "The user's national code has not been entered. Please inquire about insurance again after entering the national code"
          // );
          adapter.sendResult(deviceConfigUrl, {
            deviceCode: payload.device.deviceCode,
            message: DeviceMessage.INVALID_NATIONAL_CODE
          });
          return { message: DeviceMessage.INVALID_NATIONAL_CODE } as any;
        }

        console.log('expire', !user.insuranceExpiredDate);
        if (!user.insuranceExpiredDate) {
          // throw new BadRequestException('Please inquire first');
          adapter.sendResult(deviceConfigUrl, {
            deviceCode: payload.device.deviceCode,
            message: DeviceMessage.INVALID_INQURIE
          });
          return { message: DeviceMessage.INVALID_INQURIE } as any;
        }

        const isExInsurane = user.insuranceExpiredDate < new Date();

        if (isExInsurane) {
          // throw new BadRequestException(
          //   "The user's insurance has expired. Please inquire again after renewing the insurance"
          // );
          adapter.sendResult(deviceConfigUrl, {
            deviceCode: payload.device.deviceCode,
            message: DeviceMessage.EXPIRED_INSURANCE
          });
          return { message: DeviceMessage.EXPIRED_INSURANCE } as any;
        }
      }

      if (
        moment(receptions?.createdAt)
          .add(lastTimeReceptionConfig?.['delay-time'], 'second')
          ?.isBefore(moment(now())) ||
        !receptions
      ) {
        console.log('reception');
      } else {
        console.log('not reception');
        adapter.sendResult(deviceConfigUrl, {
          deviceCode: payload.device.deviceCode,
          message: DeviceMessage.INVALID_TRAFFIC
        });
        return { message: DeviceMessage.INVALID_TRAFFIC } as any;
      }

      const {
        registeredServiceLength,
        registeredServices,
        saleUnit,
        firstNotPaidInstallmentLoan
      } = await this.saleOrderService.getValidRegisteredService(
        payload.user.id,
        payload.device.saleUnitId
      );

      console.log(':::::', registeredServiceLength);

      if (firstNotPaidInstallmentLoan) {
        console.log('not reception');

        let saleOrderId =
          registeredServices[0]?.saleOrderId ||
          registeredServices[0]?.saleOrder?.id;

        if (firstNotPaidInstallmentLoan.order === saleOrderId) {
          const info = (await this.userService.getUserInfo(payload.user?.id, [
            firstNotPaidInstallmentLoan
          ])) as any;

          this.eventEmitter.emit(
            EventsConstant.CLIENT_REMOTE,
            createOperationDeviceEvent(
              OperationNameDevice.UNPAID_INSTALLMENT_LOAN,
              {
                user: payload.user,
                firstNotPaidInstallmentLoan,
                type: 'action'
              },
              DeviceOperationType.RECEPTION
            )
          );

          return { message: DeviceMessage.UNPAIN_INSTALLMENT_LOAN } as any;
        }
      }
      this.hasActiveReception = true;
      if (registeredServiceLength === 0) {
        const { validChargingServices, validChargingServicesLength, saleUnit } =
          await this.saleOrderService.getValidChargingService(
            payload.user.id,
            payload.device.saleUnitId
          );
        console.log('conditon 111', validChargingServicesLength === 1);
        if (validChargingServicesLength === 1) {
          const product = validChargingServices[0]?.product?.tagProductParent;
          console.log('the product is', validChargingServices);
          if (!product) {
            adapter.sendResult(deviceConfigUrl, {
              deviceCode: payload.device.deviceCode,
              message: DeviceMessage.INVALID_TAGPRODUCTPARENT_CHARGING_SERVICE
            });
            return {
              message: DeviceMessage.INVALID_TAGPRODUCTPARENT_CHARGING_SERVICE
            } as any;
          }

          return await this.receptionDeviceOpt.receptionSingleChargingService(
            {
              chargingService: validChargingServices?.[0],
              fiscalYear: payload.fiscalYear,
              product,
              saleUnit,
              user: payload.user,
              adapter,
              device: payload.device,
              deviceConfigUrl,
              identifyType: type
            },
            async () => {
              const info = (await this.userService.getUserInfo(
                payload.user?.id,
                registeredServices
              )) as any;

              this.sendUserInfoAsNotification({
                ...info,
                attendanceDeviceInfo: payload.device
              });
            }
          );
        } else if (validChargingServicesLength > 1) {
          return this.receptionDeviceOpt.noRegisteredServiceAndMultipleChargingService(
            {
              adapter,
              chargingServices: validChargingServices,
              device: payload.device,
              deviceConfigUrl,
              user: payload.user,
              type
            }
          );
        }
        const info = (await this.userService.getUserInfo(
          payload.user?.id,
          []
        )) as any;
        this.sendUserInfoAsNotification({
          ...info,
          attendanceDeviceInfo: payload.device
        });
        return this.receptionDeviceOpt.noRegisteredServiceInReceptionAction({
          user: payload.user,
          saleUnit,
          adapter,
          device: payload.device,
          deviceConfigUrl,
          type
        });
      } else if (registeredServiceLength === 1) {
        return this.receptionDeviceOpt.receptionSingleRegisteredService(
          {
            adapter,
            deviceCode: payload.device.deviceCode,
            deviceConfigUrl,
            fiscalYearId: payload.fiscalYear.id,
            organizationUnitId: payload.device.organizationUnitId!,
            registeredService: registeredServices[0],
            saleUnit,
            user: payload.user,
            device: payload.device,
            identifyType: type
          },
          async (order: SaleOrder) => {
            const info = (await this.userService.getUserInfo(
              payload.user?.id,
              registeredServices
            )) as any;

            this.sendUserInfoAsNotification({
              ...info,
              lockers:
                info.lockers.length > 0
                  ? info.lockers
                  : order?.lockers.map((l) => ({
                      ...l,
                      lockerNumber: l.locker
                    })),
              attendanceDeviceInfo: payload.device
            });
          }
        );
      } else {
        const groupByProduct = registeredServices.reduce(
          (result: any, item) => {
            if (result?.[item.product.id])
              result[item.product.id] = result?.[item.product.id] + 1;
            else result = { ...result, [item.product.id]: 1 };
            return result;
          },
          {}
        );
        if (Object.keys(groupByProduct).length === 1) {
          registeredServices.sort(
            (a, b) => new Date(a.end).getTime() - new Date(b.end).getTime()
          );

          return this.receptionDeviceOpt.receptionSingleRegisteredService(
            {
              adapter,
              deviceCode: payload.device.deviceCode,
              deviceConfigUrl,
              fiscalYearId: payload.fiscalYear.id,
              organizationUnitId: payload.device.organizationUnitId!,
              registeredService: registeredServices[0],
              saleUnit,
              user: payload.user,
              device: payload.device,
              identifyType: type
            },
            async (order: SaleOrder) => {
              const info = (await this.userService.getUserInfo(
                payload.user?.id,
                registeredServices
              )) as any;

              this.sendUserInfoAsNotification({
                ...info,
                lockers:
                  info.lockers.length > 0
                    ? info.lockers
                    : order?.lockers.map((l) => ({
                        ...l,
                        lockerNumber: l.locker
                      })),
                attendanceDeviceInfo: payload.device
              });
            }
          );
        }

        const info = (await this.userService.getUserInfo(
          payload.user?.id,
          registeredServices
        )) as any;
        this.sendUserInfoAsNotification({
          ...info,
          attendanceDeviceInfo: payload.device
        });
        return this.receptionDeviceOpt.selectRegisteredServiceToReception({
          adapter,
          deviceConfigUrl,
          saleUnit,
          user: payload.user,
          registeredServices: registeredServices,
          device: payload.device,
          identifyType: type
        });
      }
    } catch (error) {
      return this.receptionDeviceOpt.handleErrorInReceptionProcess({
        error,
        user: payload.user
      });
    } finally {
      this.hasActiveReception = false;
    }
  }

  public async locker(
    payload: RemoteDevicePayload,
    adapter: any,
    deviceConfigUrl: string
  ): Promise<void> {
    const validVipOpt = await this.lockerDeviceOpt.validateVipLockerAndOpen({
      adapter,
      device: payload.device,
      deviceConfigUrl,
      user: payload.user
    });
    if (validVipOpt) {
      return validVipOpt as any;
    }
    const reception = await ReceptionLocker.find({
      where: {
        reception: {
          end: IsNull(),
          user: {
            id: payload.user.id
          },
          deletedAt: IsNull()
        }
      },
      relations: {
        reception: true
      }
    });

    const receptionsLength = reception.length;

    if (receptionsLength === 0) {
      return this.lockerDeviceOpt.noLockerExist({
        adapter,
        deviceCode: payload.device.deviceCode,
        deviceConfigUrl,
        user: payload.user
      });
    } else if (receptionsLength === 1) {
      return this.lockerDeviceOpt.openSingleLocker({
        adapter,
        device: payload.device,
        deviceConfigUrl,
        rcp: reception[0],
        user: payload.user
      }) as any;
    } else {
      return this.lockerDeviceOpt.sendNotificationOnMultipleLocker({
        adapter,
        deviceCode: payload.device.deviceCode,
        deviceConfigUrl,
        reception,
        user: payload.user
      });
    }
  }

  public async shop(
    data: RemoteDevicePayload,
    adapeter: any,
    deviceConfigUrl: string,
    identifyType: string
  ) {
    if (!data.device.saleUnit.types.includes(SaleUnitType.Product)) {
      console.log('device not support product');
      return;
    }

    return this.shopDeviceOpt.handleShopRequest({
      device: data.device,
      user: data.user,
      adapterService: adapeter,
      deviceConfigUrl,
      identifyType
    });
  }

  generateId() {
    return Math.floor(Math.random() * 1000000000000);
  }

  public async exit(
    payload: RemoteDevicePayload,
    adapter: any,
    deviceConfigUrl: string,
    identifyType: string
  ): Promise<void> {
    console.log(48888,payload)

    const saleOrders = await SaleOrder.find({
      where: { user: { id: payload.user.id }, end: IsNull() },
      relations: {
        items: { saleUnit: true },
        transactions: true,
        saleUnit: true,
        organizationUnit: true
      }
    });
    if (saleOrders.length === 0) {
      return this.exitDeviceOpt.noReceptionToExit({
        adapter,
        device: payload.device,
        deviceConfigUrl,
        identifyType,
        user: payload.user
      });
    }
    const mustSettle = saleOrders.filter((e) => e.balance !== 0);
    if (mustSettle.length > 0) {
      return this.exitDeviceOpt.handleSettleReceptionNotification({
        adapter,
        deviceCode: payload.device.deviceCode,
        deviceConfigUrl,
        mustSettle,
        saleUnit: payload.device.saleUnit,
        user: payload.user
      });
    } else {
      const isInvalid:SaleOrder = await this.exitDeviceOpt.validationUnFairSaleItems({
        adapter,
        deviceCode: payload.device.deviceCode,
        deviceConfigUrl,
        saleOrders,
        user: payload.user,
        device: payload.device
      });

      console.log('called--------------------558',!!isInvalid);
      if (!!isInvalid) {
        this.eventEmitter.emit(
          EventsConstant.CLIENT_REMOTE,
          createOperationDeviceEvent(
            OperationNameDevice.UNFAIR_USAGE_PENALTY,
            {
              user: payload.user,
              id: this.generateId(),
              type: 'error',
              order:isInvalid,
              saleUnit:isInvalid.saleUnit,
              message: DeviceMessage.INVALID_LOGOUT_UNFAIR
            },
            DeviceOperationType.ERROR
          )
        );
        adapter.sendResult(deviceConfigUrl, {
          deviceCode: payload.device.deviceCode,
          message: DeviceMessage.INVALID_LOGOUT_UNFAIR
        });
        return { message: DeviceMessage.INVALID_LOGOUT_UNFAIR } as any;
      } else {
        console.log("called582")
        return this.exitDeviceOpt.exitMultipleReception({
          adapter,
          deviceCode: payload.device.deviceCode,
          deviceConfigUrl,
          saleOrders,
          user: payload.user,
          device: payload.device
        });
      }
    }
  }

  public async receptionAndExit(
    payload: RemoteDevicePayload,
    adapter: any,
    deviceConfigUrl: string,
    type: string
  ): Promise<void> {
    const receptions = await SaleOrder.find({
      where: {
        user: { id: payload.user.id },
        //end: IsNull(),
        reception: true
      },
      order: { createdAt: -1 }
    });

    const insuranceSetting = await Setting.findByKey(SettingKey.Insurance);
    const user = await User.findOne({ where: { id: payload.user.id } });

    if (insuranceSetting && insuranceSetting.checkInsurance) {
      if (!user?.nationCode) {
        // throw new BadRequestException(
        //   "The user's national code has not been entered. Please inquire about insurance again after entering the national code"
        // );
        adapter.sendResult(deviceConfigUrl, {
          deviceCode: payload.device.deviceCode,
          message: DeviceMessage.INVALID_NATIONAL_CODE
        });
        return { message: DeviceMessage.INVALID_NATIONAL_CODE } as any;
      }

      console.log('expire', !user.insuranceExpiredDate);
      if (!user.insuranceExpiredDate) {
        // throw new BadRequestException('Please inquire first');
        adapter.sendResult(deviceConfigUrl, {
          deviceCode: payload.device.deviceCode,
          message: DeviceMessage.INVALID_INQURIE
        });
        return { message: DeviceMessage.INVALID_INQURIE } as any;
      }

      const isExInsurane = user.insuranceExpiredDate < new Date();

      if (isExInsurane) {
        // throw new BadRequestException(
        //   "The user's insurance has expired. Please inquire again after renewing the insurance"
        // );
        adapter.sendResult(deviceConfigUrl, {
          deviceCode: payload.device.deviceCode,
          message: DeviceMessage.EXPIRED_INSURANCE
        });
        return { message: DeviceMessage.EXPIRED_INSURANCE } as any;
      }
    }

    const lastTimeReceptionConfig = await Setting.findByKey(
      SettingKey.IdentificationConfig
    );

    const lastReceptionSubmitedAt = moment(receptions[0]?.createdAt).add(
      lastTimeReceptionConfig?.['exit-time'],
      'second'
    );

    if (
      receptions.length > 0 &&
      receptions[0]?.end === null &&
      moment(lastReceptionSubmitedAt).isBefore(moment(now()))
    ) {
      return await this.exit(payload, adapter, deviceConfigUrl, type);
    } else {
      if (
        receptions.length === 0 ||
        (moment(receptions[0]?.createdAt)
          .add(lastTimeReceptionConfig?.['delay-time'], 'second')
          ?.isBefore(moment(now())) &&
          moment(receptions[0]?.end)
            .add(lastTimeReceptionConfig?.['delay-time'], 'second')
            ?.isBefore(moment(now()))) ||
        (moment(receptions[0]?.createdAt)
          .add(lastTimeReceptionConfig?.['delay-time'], 'second')
          ?.isBefore(moment(now())) &&
          receptions[0]?.end === null)
      ) {
        console.log('reception');
        return await this.reception(payload, adapter, deviceConfigUrl, type);
      } else {
        console.log('not reception');
        adapter.sendResult(deviceConfigUrl, {
          deviceCode: payload.device.deviceCode,
          message: DeviceMessage.INVALID_TRAFFIC
        });

        return { message: DeviceMessage.INVALID_TRAFFIC } as any;
      }
    }
  }

  async handleExecutingProcess(payload: RemoteDeviceProcess) {
    console.log('payload', payload);
    const device = await this.findDeviceById(payload.deviceId);

    const user = await this.findUserByCode(payload.code);
    const fiscalYear = await this.findCurrentFiscalYear();
    const processPayload: RemoteDevicePayload = {
      user,
      device,
      fiscalYear
    };

    const deviceConfig = await this.getDeviceConfig();

    console.log('device.deviceOperation', device.deviceOperation);
    const adapterService: RemoveDeviceAdapterService =
      this.adapterService.getAdapter(device.type);
    switch (device.deviceOperation) {
      case DeviceOperation.Exit:
        return this.exit(
          processPayload,
          adapterService,
          deviceConfig.url,
          payload.identifyType
        );
      case DeviceOperation.Reception:
        return this.reception(
          processPayload,
          adapterService,
          deviceConfig.url,
          payload.identifyType
        );
      case DeviceOperation.Locker:
        return this.locker(processPayload, adapterService, deviceConfig.url);
      case DeviceOperation.ReceptionAndExit:
        return this.receptionAndExit(
          processPayload,
          adapterService,
          deviceConfig.url,
          payload.identifyType
        );
      case DeviceOperation.Shop:
        return this.shop(
          processPayload,
          adapterService,
          deviceConfig.url,
          payload.identifyType
        );
      case DeviceOperation.OpenGate:
        return this.openGate(processPayload, adapterService, deviceConfig.url);
      default:
        console.log('non implemting process');
    }
  }

  async openGate(
    payload: RemoteDevicePayload,
    adapterService: any,
    deviceConfigUrl: string
  ) {
    const receptions = await SaleOrder.count({
      where: {
        end: IsNull(),
        reception: true,
        start: MoreThanOrEqual(new Date(moment().format('YYYY-MM-DD'))),
        user: { id: payload.user.id }
      }
    });

    if (receptions === 0) {
      adapterService.sendResult(deviceConfigUrl, {
        deviceCode: payload.device.deviceCode,
        message: DeviceMessage.NO_RECEPTION_EXIST_TO_OPEN_GATE
      });
      this.eventEmitter.emit(
        EventsConstant.CLIENT_REMOTE,
        createOperationDeviceEvent(
          OperationNameDevice.NO_RECEPTION_OPEN_GATE,
          {
            user: payload.user,
            id: this.generateId(),
            type: 'error'
          },
          DeviceOperationType.RECEPTION
        )
      );
      return { message: DeviceMessage.NO_RECEPTION_EXIST_TO_OPEN_GATE } as any;
    }
    this.eventEmitter.emit(
      EventsConstant.CLIENT_REMOTE,
      createOperationDeviceEvent(
        OperationNameDevice.OPEN_GATE_SUCCESSFULL,
        {
          user: payload.user,
          id: this.generateId(),
          type: 'news'
        },
        DeviceOperationType.RECEPTION
      )
    );

    adapterService.openGate(deviceConfigUrl, {
      deviceCode: payload.device.deviceCode
    });

    adapterService.sendResult(deviceConfigUrl, {
      deviceCode: payload.device.deviceCode,
      message: DeviceMessage.OPEN_GATE_SUCCESSFULL
    });

    return { message: DeviceMessage.OPEN_GATE_SUCCESSFULL } as any;
  }

  async findDeviceById(deviceCode: string) {
    const KEY = `device_${deviceCode}`;
    await this.redis.del(KEY);
    const deviceFromCache = await this.redis.get(KEY);
    if (deviceFromCache) {
      return JSON.parse(deviceFromCache);
    }
    const device = await AttendanceDevice.findOne({
      where: { deviceCode },
      relations: { saleUnit: true, operators: true, defaultPrinter: true }
    });
    if (!device) {
      throw new NotFoundException('device not found');
    }
    this.redis.set(`device_${device.id}`, JSON.stringify(device));
    return device;
  }

  async findUserByCode(code: number) {
    const user = await this.userService.findByCode(code);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    return user;
  }

  async findCurrentFiscalYear() {
    const currentDate = new Date();
    const fiscalYear = await FiscalYear.findOne({
      where: {
        start: LessThanOrEqual(currentDate),
        end: MoreThanOrEqual(currentDate)
      }
    });
    if (!fiscalYear) {
      throw new NotFoundException('fiscal year not found ...');
    }
    return fiscalYear;
  }

  async getDeviceConfig() {
    const config = await Setting.findByKey(SettingKey.DeviceConfig);
    if (!config) {
      throw new NotFoundException('config is not found');
    }
    return config;
  }

  async requestToCreateSample(data: RequestToCreateSampleDTO) {
    const user = await this.userService.findByCode(data.userCode);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    const device = await AttendanceDevice.findOne({
      where: { id: data.deviceId }
    });
    if (!device) {
      throw new NotFoundException('device not found');
    }
    const deviceConfig = await this.getDeviceConfig();
    const adapterService: RemoveDeviceAdapterService =
      this.adapterService.getAdapter(device.type);
    const payload = {
      deviceCode: device.deviceCode,
      memberCode: user.code,
      memberFullName: user.firstName.concat(' ' + user.lastName)
    };
    console.log(11, payload);
    if (data.type === DeviceSampleType.CARD) {
      const result = await adapterService.saveCardNumber(
        deviceConfig.url,
        payload
      );
      if (result?.[0]?.Paliz_SaveCardNumberResult) {
        await User.update(
          { code: user.code },
          { cardSampleCreatedAt: new Date() }
        );
      }
      return result;
    } else if (data.type === DeviceSampleType.FINGER_PRINT) {
      const result = await adapterService.saveFingerPrint(
        deviceConfig.url,
        payload
      );
      if (result?.[0]?.Paliz_SaveFingerPrintResult) {
        await User.update(
          { code: user.code },
          { fingerSampleCreatedAt: new Date() }
        );
      }
      return result;
    } else if (data.type === DeviceSampleType.FACE) {
      const result = await adapterService.saveFace(deviceConfig.url, payload);
      if (result?.[0]?.Paliz_SaveCardNumberResult) {
        await User.update(
          { code: user.code },
          { faceSampleCreatedAt: new Date() }
        );
      }
      return result;
    } else {
      throw new BadRequestException('Invalid Sample type');
    }
  }

  async unableToReception(userId: string, deviceCode: string) {
    const user = await this.userService.findByCode(parseInt(userId));
    if (!user) {
      throw new NotFoundException('user not found');
    }

    console.log('userId:: ', userId);
    console.log('deviceCode:: ', deviceCode);

    const device = await this.findDeviceById(deviceCode);

    const deviceConfig = await this.getDeviceConfig();

    const adapterService: RemoveDeviceAdapterService =
      this.adapterService.getAdapter(device.type);

    this.eventEmitter.emit(
      EventsConstant.CLIENT_REMOTE,
      createOperationDeviceEvent(
        OperationNameDevice.UNABLE_TO_RECEPTION,
        {
          user: user,
          id: this.generateId(),
          type: 'action',
          name: 'xx'
        },
        DeviceOperationType.RECEPTION
      )
    );

    adapterService.sendResult(deviceConfig.url, {
      deviceCode: device.deviceCode,
      message: DeviceMessage.UNABLE_TO_RECEPTION
    });

    return { message: DeviceMessage.UNABLE_TO_RECEPTION } as any;
  }

  sendUserInfoAsNotification({
    insuranceInfo,
    services,
    user,
    vipLocker,
    subscriptionInfo,
    attendanceDeviceInfo,
    lockers
  }: {
    user: User;
    services: SaleItem[];
    vipLocker: any;
    insuranceInfo: any;
    subscriptionInfo: any;
    attendanceDeviceInfo: any;
    lockers: any;
  }) {
    this.eventEmitter.emit(
      EventsConstant.CLIENT_REMOTE,
      createOperationDeviceEvent(
        OperationNameDevice.DEVICE_NOTIFICATION_TRAFFIC,
        {
          user,
          services,
          vipLocker,
          insuranceInfo,
          subscriptionInfo,
          attendanceDeviceInfo,
          lockers
        },
        DeviceOperationType.RECEPTION
      )
    );
  }
}
