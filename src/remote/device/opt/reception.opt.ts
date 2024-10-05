import { Inject, Injectable } from '@nestjs/common';
import { SaleOrderDto } from '../../../automation/operational/dto/sale-order.dto';
import {
  RegisteredServiceStatus,
  SaleItem,
  SaleUnitType
} from '../../../automation/operational/entities/SaleItem';
import { SaleUnit } from '../../../base/entities/SaleUnit';
import { Role, User } from '../../../base/entities/User';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';
import {
  DeviceOperationType,
  OperationNameDevice,
  createOperationDeviceEvent
} from '../device.util';
import { DeviceMessage } from '../device.constant';
import moment from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { In, IsNull, MoreThanOrEqual } from 'typeorm';
import { ReceptionLocker } from '../../../automation/operational/entities/ReceptionLocker';
import { SaleOrderService } from '../../../automation/operational/service/sale-order.service';
import { LockerItem } from '../../../automation/operational/entities/LockerItem';
import { LocalLockerManagerService } from '../../../remote/locker-manager/service/local-locker-manager.service';
import { AttendanceDevice } from '../../../base/entities/AttendanceDevice';
import { SaleOrder } from '../../../automation/operational/entities/SaleOrder';
import { DeviceLogService } from '../device-log.service';
import {
  NeedLockerType,
  Product
} from '../../../automation/base/entities/Product';
import { FiscalYear } from '../../../base/entities/FiscalYears';
import { TransactionSourceType } from '../../../base/entities/TransactionSource';

interface NoRegisteredServiceInReceptionAction {
  user: User;
  saleUnit: SaleUnit;
  adapter: any;
  deviceConfigUrl: string;
  device: AttendanceDevice;
  type: string;
}

interface SelectContractorInReceptionAction {
  user: User;
  registeredService: SaleItem;
  saleUnit: SaleUnit;
  adapter: any;
  deviceConfigUrl: string;
  deviceCode: string;
}

type ReceptionSingleRegisteredService = {
  fiscalYearId: number;
  organizationUnitId: number;
  device: AttendanceDevice;
  identifyType: string;
} & SelectContractorInReceptionAction;

interface SelectRegisteredServiceToReception {
  user: User;
  registeredServices: SaleItem[];
  saleUnit: SaleUnit;
  adapter: any;
  deviceConfigUrl: string;
  device: AttendanceDevice;
  identifyType: string;
}

interface HandleErrorInReceptionProcess {
  error: Error;
  user: User;
}

@Injectable()
export class ReceptionDeviceOpt {
  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;

  @Inject(SaleOrderService)
  private readonly saleOrderService: SaleOrderService;

  @Inject(LocalLockerManagerService)
  private readonly lockerServiceManager: LocalLockerManagerService;

  @Inject(DeviceLogService)
  private readonly deviceLogService: DeviceLogService;

  generateId() {
    return Math.floor(Math.random() * 1000000000000);
  }

  async noRegisteredServiceInReceptionAction({
    adapter,
    deviceConfigUrl,
    saleUnit,
    user,
    device,
    type
  }: NoRegisteredServiceInReceptionAction) {
    this.eventEmitter.emit(
      EventsConstant.CLIENT_REMOTE,
      createOperationDeviceEvent(
        OperationNameDevice.NO_RGS,
        {
          user,
          saleUnit,
          id: this.generateId(),
          type: 'error'
        },
        DeviceOperationType.RECEPTION
      )
    );
    adapter.sendResult(deviceConfigUrl, {
      deviceCode: device.deviceCode,
      message: DeviceMessage.NO_REGISTERED_SERVICE_EXIST
    });
    await this.deviceLogService.create({
      device,
      deviceMessage: DeviceMessage.NO_REGISTERED_SERVICE_EXIST,
      description: DeviceMessage.NO_REGISTERED_SERVICE_EXIST,
      type: DeviceOperationType.RECEPTION,
      user,
      identifyType: type
    });

    return { message: DeviceMessage.NO_REGISTERED_SERVICE_EXIST } as any;
  }

  async vipFilledError({
    adapter,
    device,
    deviceConfigUrl,
    saleUnit,
    user,
    identifyType
  }: {
    user: User;
    saleUnit: SaleUnit;
    adapter: any;
    deviceConfigUrl: string;
    device: AttendanceDevice;
    identifyType: string;
  }) {
    this.eventEmitter.emit(
      EventsConstant.CLIENT_REMOTE,
      createOperationDeviceEvent(
        OperationNameDevice.FILLED_VIP_ERROR,
        {
          user,
          saleUnit,
          id: this.generateId(),
          type: 'error'
        },
        DeviceOperationType.ERROR
      )
    );

    adapter.sendResult(deviceConfigUrl, {
      deviceCode: device.deviceCode,
      message: DeviceMessage.VIP_LOCKER_FILLED_ERROR
    });

    await this.deviceLogService.create({
      device,
      deviceMessage: DeviceMessage.VIP_LOCKER_FILLED_ERROR,
      type: DeviceOperationType.RECEPTION,
      user,
      identifyType
    });

    return { message: DeviceMessage.VIP_LOCKER_FILLED_ERROR } as any;
  }

  async receptionSingleRegisteredService(
    {
      registeredService,
      adapter,
      deviceCode,
      deviceConfigUrl,
      saleUnit,
      user,
      fiscalYearId,
      organizationUnitId,
      device,
      identifyType
    }: ReceptionSingleRegisteredService,
    newOrderCallback: (order: SaleOrder) => any
  ) {
    console.log('receptionSingleRegisteredService');
    let contractor: any;
    if (registeredService.product.hasContractor) {
      if (registeredService.contractor) {
        contractor = registeredService.contractor.id;
      } else {
        if (registeredService.product.contractors.length > 1) {
          this.eventEmitter.emit(
            EventsConstant.CLIENT_REMOTE,
            createOperationDeviceEvent(
              OperationNameDevice.SELECT_CONTRACTOR_RECEPTION,
              {
                user,
                registeredService,
                saleUnit,
                id: this.generateId(),
                type: 'action'
              },
              DeviceOperationType.RECEPTION
            )
          );
          adapter.sendResult(deviceConfigUrl, {
            deviceCode,
            message: DeviceMessage.SELECT_YOUR_CONTRACTOR
          });
          await this.deviceLogService.create({
            device,
            deviceMessage: DeviceMessage.SELECT_YOUR_CONTRACTOR,
            type: DeviceOperationType.RECEPTION,
            user,
            description: `پیمانکاران : ${registeredService.product.contractors
              .map((e) =>
                e.contractor.firstName.concat(' ', e.contractor.lastName)
              )
              .join(',')}`,
            identifyType
          });
          return { message: DeviceMessage.SELECT_YOUR_CONTRACTOR } as any;
        } else {
          contractor =
            registeredService.product?.contractors?.[0]?.contractor?.id;
        }
      }
    }

    const order: SaleOrderDto = {
      saleUnit: device.saleUnitId,
      organizationUnit: organizationUnitId,
      user: user.id,
      fiscalYear: fiscalYearId,
      submitAt: moment().format(AppConstant.DATETIME_FORMAT),
      lockers: [],
      lockerQuantity: 0,
      freeReception: false,
      isCreatedByDevice: true,
      items: [
        {
          amount: 0,
          duration: 1,
          discount: 0,
          persons: 1,
          quantity: 1,
          registeredService: registeredService.id,
          type: SaleUnitType.Reception,
          user: user.id,
          product: registeredService.product.id,
          priceId: registeredService.priceId,
          submitAt: new Date(),
          contractor
        }
      ]
    };
    console.log('saleUnit.needLocker2', saleUnit.needLocker);
    if (saleUnit.needLocker === NeedLockerType.Yes) {
      //! auto assign
      const vipLockers = await this.findVipLockerUser(user.id);
      console.log('vipLockers', vipLockers);
      if (vipLockers.length > 0) {
        if (
          (await SaleOrder.count({
            where: {
              vipLocker: {
                lockerNumber: In(vipLockers.map((e) => e.locker.lockerNumber))
              },
              end: IsNull()
            }
          })) > 0
        ) {
          this.vipFilledError({
            user,
            saleUnit,
            adapter,
            device,
            deviceConfigUrl,
            identifyType
          });
          return;
        }
        order.lockers = [];
        order.lockerQuantity = 0;
      } else {
        order.lockers = [];
        order.lockerQuantity = 1;

        // if (
        //   !saleUnit.autoAssign &&
        //   registeredService.product.needLocker !== NeedLockerType.No
        // ) {
        //   this.eventEmitter.emit(
        //     EventsConstant.CLIENT_REMOTE,
        //     createOperationDeviceEvent(
        //       OperationNameDevice.SELECT_LOCKER,
        //       {
        //         user,
        //         saleUnit,
        //         order: order,
        //         id: this.generateId(),
        //         type: 'action'
        //       },
        //       DeviceOperationType.RECEPTION
        //     )
        //   );

        //   adapter.sendResult(deviceConfigUrl, {
        //     deviceCode: device.deviceCode,
        //     message: DeviceMessage.SELECT_YOUR_LOCKER
        //   });

        //   await this.deviceLogService.create({
        //     device,
        //     deviceMessage: DeviceMessage.SELECT_YOUR_LOCKER,
        //     type: DeviceOperationType.RECEPTION,
        //     user,
        //     identifyType
        //   });
        //   return { message: DeviceMessage.SELECT_YOUR_LOCKER } as any;
        // }
      }
    }

    const saleOrderResult = await this.saleOrderService.submit(
      order,
      undefined,
      async (order) => {
        // newOrderCallback(order?.items?.[0]?.product?.id);
        newOrderCallback(order);
        this.eventEmitter.emit(
          EventsConstant.CLIENT_REMOTE,
          createOperationDeviceEvent(
            OperationNameDevice.AUTO_RECEPTION,
            {
              user: order.user,
              order: order,
              type: 'news',
              id: Math.floor(Math.random() * 1000000000000)
            },
            DeviceOperationType.RECEPTION
          )
        );
        if (device.defaultPrinter) {
          setTimeout(() => {
            adapter.print(deviceConfigUrl, {
              reportName: 'RECEPTION',
              dataSource: JSON.stringify({
                id: order.id,
                saleUnitId: saleUnit.id,
                device
              })
            });
          }, 2000);
        }
        if (order?.lockers?.length > 0) {
          const lockerItems = await Promise.all(
            order.lockers.map((rcpLocker) => {
              return LockerItem.findOne({
                where: { lockerNumber: rcpLocker.locker }
              });
            })
          );
          console.log('calledddddd 328');
          this.eventEmitter.emit(
            EventsConstant.LOCKER_ASSIGNED_DEVICE,
            lockerItems.map((e) => ({
              id: e.lockerId,
              state: 2,
              relayNumber: e.relayNumber + 1
            }))
          );
          console.log('called 337');
          // await this.lockerServiceManager.singleLockerManager(
          //   lockerItems.map((e) => ({
          //     id: e.lockerId,
          //     state: 2,
          //     relayNumber: e.relayNumber + 1
          //   }))
          // );
        } else {
          if (
            order?.vipLocker
            // (order.user.roles.includes(Role.Admin) || //! it seems wrong condition so i comment it
            //   order.user.roles.includes(Role.Contactor) ||
            //   order.user.roles.includes(Role.User))
          ) {
            //   await this.lockerServiceManager.singleLockerManager(
            //     [
            //     {
            //       id: order?.vipLocker?.lockerId,
            //       state: 2,
            //       relayNumber: order?.vipLocker?.relayNumber + 1
            //     }
            //   ]
            // );
            this.eventEmitter.emit(EventsConstant.LOCKER_ASSIGNED_DEVICE, [
              {
                id: order?.vipLocker?.lockerId,
                state: 2,
                relayNumber: order?.vipLocker?.relayNumber + 1
              }
            ]);
          }
        }

        if (order?.lockers?.length > 0) {
          if (device.hasGate) {
            adapter.openGate(deviceConfigUrl, { deviceCode });
            console.log('gate opened');
          }
          adapter.sendResult(deviceConfigUrl, {
            deviceCode,
            message: DeviceMessage.SUCCESSFUL_RCP_LOCKER(
              order.lockers.map((e) => e.locker)
            )
          });

          await this.deviceLogService.create({
            device,
            deviceMessage: DeviceMessage.SUCCESSFUL_RCP_LOCKER(
              order.lockers.map((e) => e.locker)
            ),
            type: DeviceOperationType.RECEPTION,
            user,
            description: `سریال پذیرش ساخته شده : ${
              order?.id
            } و کمد های تخصیص داده شده : ${order.lockers
              .map((e) => e.locker)
              .join(',')}`,
            identifyType
          });

          return {
            message: DeviceMessage.SUCCESSFUL_RCP_LOCKER(
              order.lockers.map((e) => e.locker)
            )
          } as any;
        }

        if (order?.vipLocker) {
          if (device.hasGate) {
            console.log('gate opened');
            adapter.openGate(deviceConfigUrl, { deviceCode });
          }
          adapter.sendResult(deviceConfigUrl, {
            deviceCode,
            message: DeviceMessage.SUCCESSFUL_RCP_LOCKER([
              order?.vipLocker?.lockerNumber
            ])
          });
          await this.deviceLogService.create({
            device,
            deviceMessage: DeviceMessage.SUCCESSFUL_RCP_LOCKER([
              order?.vipLocker?.lockerNumber
            ]),
            type: DeviceOperationType.RECEPTION,
            user,
            description: `سریال پذیرش ساخته شده : ${order?.id} و کمد وی ای پی تخصیص داده شده : ${order?.vipLocker?.lockerNumber}`,
            identifyType
          });
          return {
            message: DeviceMessage.SUCCESSFUL_RCP_LOCKER([
              order?.vipLocker?.lockerNumber
            ])
          } as any;
        }

        adapter.sendResult(deviceConfigUrl, {
          deviceCode,
          message: DeviceMessage.SUCCESSFUL_RCP
        });

        await this.deviceLogService.create({
          device,
          deviceMessage: DeviceMessage.SUCCESSFUL_RCP,
          type: DeviceOperationType.RECEPTION,
          user,
          description: `سریال پذیرش ساخته شده : ${order?.id}`,
          identifyType
        });

        if (device.hasGate) {
          adapter.openGate(deviceConfigUrl, { deviceCode });
          adapter.sendResult(deviceConfigUrl, {
            deviceCode,
            message: DeviceMessage.OPEN_GATE_SUCCESSFULL
          });
          await this.deviceLogService.create({
            device,
            deviceMessage: DeviceMessage.OPEN_GATE_SUCCESSFULL,
            type: DeviceOperationType.RECEPTION,
            user,
            description: `پذیرشی با سریال ${order.id} ساخته شد و گیت مرتبط به آن باز شد`,
            identifyType
          });

          return { message: DeviceMessage.OPEN_GATE_SUCCESSFULL } as any;
        }

        return { message: DeviceMessage.SUCCESSFUL_RCP } as any;
      }
    );

    return {
      message: saleOrderResult
        ? DeviceMessage.SUCCESSFUL_RCP
        : DeviceMessage.FAILED_RCP
    };
  }

  async noRegisteredServiceAndMultipleChargingService({
    adapter,
    chargingServices,
    device,
    deviceConfigUrl,
    user,
    type
  }: {
    adapter: any;
    device: AttendanceDevice;
    user: User;
    chargingServices: SaleItem[];
    deviceConfigUrl: string;
    type: string;
  }) {
    this.eventEmitter.emit(
      EventsConstant.CLIENT_REMOTE,
      createOperationDeviceEvent(
        OperationNameDevice.MULTIPLE_CHARGING_SERVICE,
        {
          user,
          saleUnit: device.saleUnit,
          id: this.generateId(),
          type: 'action'
        },
        DeviceOperationType.RECEPTION
      )
    );
    adapter.sendResult(deviceConfigUrl, {
      deviceCode: device.deviceCode,
      message: DeviceMessage.NO_RGS_AND_MULTIPLE_CHARGING_SERVICE
    });
    await this.deviceLogService.create({
      device,
      deviceMessage: DeviceMessage.NO_RGS_AND_MULTIPLE_CHARGING_SERVICE,
      description: chargingServices.map((e) => e.title).join(', '),
      type: DeviceOperationType.RECEPTION,
      user,
      identifyType: type
    });

    return {
      message: DeviceMessage.NO_RGS_AND_MULTIPLE_CHARGING_SERVICE
    } as any;
  }

  async receptionSingleChargingService(
    {
      product,
      user,
      fiscalYear,
      chargingService,
      saleUnit,
      adapter,
      device,
      deviceConfigUrl,
      identifyType
    }: {
      product: Product;
      user: User;
      fiscalYear: FiscalYear;
      chargingService: SaleItem;
      saleUnit: SaleUnit;
      adapter: any;
      device: AttendanceDevice;
      deviceConfigUrl: string;
      identifyType: string;
    },
    newOrderCallback: any
  ) {
    console.log('length schedule ', product?.schedules?.length);
    const productPrice =
      (product.schedules?.length > 0 &&
        product.schedules.find((schedule) => {
          var startTime = moment(schedule.from, 'HH:mm:ss');
          var endTime = moment(schedule.to, 'HH:mm:ss');
          var currentTime = moment(new Date(), 'HH:mm:ss');
          return (
            schedule.days.includes(moment().isoWeekday()) &&
            currentTime.isBetween(startTime, endTime)
          );
        })?.price) ||
      product.price;

    const saleOrderPayload: SaleOrderDto = {
      user: user.id,
      saleUnit: saleUnit.id,
      fiscalYear: fiscalYear,
      freeReception: false,
      isCreatedByDevice: true,
      submitAt: moment().format(AppConstant.DATETIME_FORMAT),
      lockers: [],
      lockerQuantity: 0,
      transactions: [
        {
          type: TransactionSourceType.ChargingService,
          source: chargingService?.id,
          amount: productPrice,
          user: user.id,
          submitAt: moment().format(AppConstant.DATETIME_FORMAT)
        }
      ],
      items: [
        {
          product: product.id,
          quantity: 1,
          persons: 1,
          discount: 0,
          price: productPrice,
          tax: 0,
          amount: productPrice,
          manualPrice: false,
          type: SaleUnitType.Reception,
          registeredService: 0,
          groupClassRoom: null,
          priceId: null,
          description: null
        }
      ]
    };

    if (chargingService.credit - chargingService.usedCredit < productPrice) {
      this.eventEmitter.emit(
        EventsConstant.CLIENT_REMOTE,
        createOperationDeviceEvent(
          OperationNameDevice.NO_ENOUGH_CREDIT_CHARGING_SERVICE,
          {
            user,
            saleUnit,
            id: this.generateId(),
            type: 'news'
          },
          DeviceOperationType.RECEPTION
        )
      );

      adapter.sendResult(deviceConfigUrl, {
        deviceCode: device.deviceCode,
        message: DeviceMessage.NO_ENOUGHT_CREDIT_FOR_CHARGING_SERVICE
      });

      await this.deviceLogService.create({
        device,
        deviceMessage: DeviceMessage.NO_ENOUGHT_CREDIT_FOR_CHARGING_SERVICE,
        type: DeviceOperationType.RECEPTION,
        user,
        description: `موجودی خدمت شارژی کافی نیست`,
        identifyType
      });

      return {
        message: DeviceMessage.NO_ENOUGHT_CREDIT_FOR_CHARGING_SERVICE
      } as any;
    }

    if (product.hasContractor) {
      if (product.contractors && product.contractors?.length === 1) {
        saleOrderPayload.items[0].contractor = product.contractors[0]?.id;
      } else {
        console.log('select multiple contractor');

        this.eventEmitter.emit(
          EventsConstant.CLIENT_REMOTE,
          createOperationDeviceEvent(
            OperationNameDevice.SELECT_CONTRACTOR_RECEPTION,
            {
              user,
              registeredService: product,
              saleUnit,
              id: this.generateId(),
              type: 'action'
            },
            DeviceOperationType.RECEPTION
          )
        );

        adapter.sendResult(deviceConfigUrl, {
          deviceCode: device.deviceCode,
          message: DeviceMessage.SELECT_YOUR_CONTRACTOR
        });

        await this.deviceLogService.create({
          device,
          deviceMessage: DeviceMessage.SELECT_YOUR_CONTRACTOR,
          type: DeviceOperationType.RECEPTION,
          user,
          description: `پیمانکاران : ${product.contractors
            ?.map((e) =>
              e.contractor.firstName.concat(' ', e.contractor.lastName)
            )
            .join(',')}`,
          identifyType
        });

        return { message: DeviceMessage.SELECT_YOUR_CONTRACTOR } as any;
      }
    }

    // auto assign is not important in device
    // if (saleUnit.hasLocker && !saleUnit.autoAssign) {
    //   const vipLockers = await this.findVipLockerUser(user.id);
    //   if (vipLockers.length > 0) {
    //     let selectedVipLocker;
    //     for (const vipLocker of vipLockers) {
    //       const lockerReception = await ReceptionLocker.findOne({
    //         where: {
    //           locker: vipLocker.locker.lockerNumber,
    //           reception: { end: IsNull() }
    //         }
    //       });
    //       if (lockerReception) {
    //         selectedVipLocker = vipLocker?.locker?.relayNumber;
    //       }
    //     }
    //     if (selectedVipLocker) {
    //       saleOrderPayload.lockers = [selectedVipLocker];
    //       saleOrderPayload.lockerQuantity = undefined;
    //     } else {
    //       // console.log('select your locker');
    //       // this.eventEmitter.emit(
    //       //   EventsConstant.CLIENT_REMOTE,
    //       //   createOperationDeviceEvent(
    //       //     OperationNameDevice.SELECT_LOCKER,
    //       //     {
    //       //       user,
    //       //       saleUnit,
    //       //       order: saleOrderPayload,
    //       //       id: this.generateId(),
    //       //       type: 'action'
    //       //     },
    //       //     DeviceOperationType.RECEPTION
    //       //   )
    //       // );

    //       // adapter.sendResult(deviceConfigUrl, {
    //       //   deviceCode: device.deviceCode,
    //       //   message: DeviceMessage.SELECT_YOUR_LOCKER
    //       // });

    //       // await this.deviceLogService.create({
    //       //   device,
    //       //   deviceMessage: DeviceMessage.SELECT_YOUR_LOCKER,
    //       //   type: DeviceOperationType.RECEPTION,
    //       //   user,
    //       //   identifyType
    //       // });
    //       // return { message: DeviceMessage.SELECT_YOUR_LOCKER } as any;
    //     }
    //   } else {
    //     // console.log('select locker');
    //     // this.eventEmitter.emit(
    //     //   EventsConstant.CLIENT_REMOTE,
    //     //   createOperationDeviceEvent(
    //     //     OperationNameDevice.SELECT_LOCKER,
    //     //     {
    //     //       user,
    //     //       saleUnit,
    //     //       order: saleOrderPayload,
    //     //       id: this.generateId(),
    //     //       type: 'action'
    //     //     },
    //     //     DeviceOperationType.RECEPTION
    //     //   )
    //     // );

    //     // adapter.sendResult(deviceConfigUrl, {
    //     //   deviceCode: device.deviceCode,
    //     //   message: DeviceMessage.SELECT_YOUR_LOCKER
    //     // });

    //     // await this.deviceLogService.create({
    //     //   device,
    //     //   deviceMessage: DeviceMessage.SELECT_YOUR_LOCKER,
    //     //   type: DeviceOperationType.RECEPTION,
    //     //   user,
    //     //   identifyType
    //     // });

    //     // return { message: DeviceMessage.SELECT_YOUR_LOCKER } as any;
    //   }

    //   if (!saleOrderPayload.lockers) {
    //     console.log('select your locker');
    //     adapter.sendResult(deviceConfigUrl, {
    //       deviceCode: device.deviceCode,
    //       message: DeviceMessage.SELECT_YOUR_LOCKER
    //     });

    //     adapter.sendResult(deviceConfigUrl, {
    //       deviceCode: device.deviceCode,
    //       message: DeviceMessage.SELECT_YOUR_LOCKER
    //     });

    //     await this.deviceLogService.create({
    //       device,
    //       deviceMessage: DeviceMessage.SELECT_YOUR_LOCKER,
    //       type: DeviceOperationType.RECEPTION,
    //       user,
    //       identifyType
    //     });

    //     return { message: DeviceMessage.SELECT_YOUR_LOCKER } as any;
    //`
    //   }
    // } else
    console.log('saleunit condiotn', saleUnit.needLocker);
    if (saleUnit.needLocker === NeedLockerType.Yes) {
      const vipLockers = await this.findVipLockerUser(user.id);
      console.log('vipLocker length', vipLockers.length);
      if (vipLockers.length > 0) {
        if (
          (await SaleOrder.count({
            where: {
              vipLocker: {
                lockerNumber: In(vipLockers.map((e) => e.locker.lockerNumber))
              },
              end: IsNull()
            }
          })) > 0
        ) {
          console.log('error in vip locker');
          this.vipFilledError({
            user,
            saleUnit,
            adapter,
            device,
            deviceConfigUrl,
            identifyType
          });

          return { message: DeviceMessage.VIP_LOCKER_FILLED_ERROR } as any;
        }
        saleOrderPayload.lockers = [];
        saleOrderPayload.lockerQuantity = 0;
      } else {
        saleOrderPayload.lockers = [];
        saleOrderPayload.lockerQuantity = 1;
        // console.log('saleUnit.autoAssign', saleUnit.autoAssign);
        // if (!saleUnit.autoAssign && product.needLocker!==NeedLockerType.No) { //دستگاه همیشه باید به صورت اتوماتیک باید کمد بدهد
        //   console.log('select your locker 854');
        //   this.eventEmitter.emit(
        //     EventsConstant.CLIENT_REMOTE,
        //     createOperationDeviceEvent(
        //       OperationNameDevice.SELECT_LOCKER,
        //       {
        //         user,
        //         saleUnit,
        //         order: saleOrderPayload,
        //         id: this.generateId(),
        //         type: 'action'
        //       },
        //       DeviceOperationType.RECEPTION
        //     )
        //   );

        //   adapter.sendResult(deviceConfigUrl, {
        //     deviceCode: device.deviceCode,
        //     message: DeviceMessage.SELECT_YOUR_LOCKER
        //   });

        //   await this.deviceLogService.create({
        //     device,
        //     deviceMessage: DeviceMessage.SELECT_YOUR_LOCKER,
        //     type: DeviceOperationType.RECEPTION,
        //     user,
        //     identifyType
        //   });
        //   return { message: DeviceMessage.SELECT_YOUR_LOCKER } as any;
        // }
      }
    }

    const saleOrderResult = await this.saleOrderService.submit(
      saleOrderPayload,
      undefined,
      async (order: SaleOrder) => {
        console.log('the order is', order);
        newOrderCallback(order?.items?.[0]?.product?.id);
        this.eventEmitter.emit(
          EventsConstant.CLIENT_REMOTE,
          createOperationDeviceEvent(
            OperationNameDevice.AUTO_RECEPTION,
            {
              user: user,
              order: {
                items: order.items.map((e, i) =>
                  i === 0
                    ? {
                        ...e,
                        registeredService: {
                          credit: chargingService.credit,
                          usedCredit: chargingService.usedCredit,
                          end: chargingService.end
                        }
                      }
                    : e
                ),
                id: order.id
              },
              type: 'news',
              id: Math.floor(Math.random() * 1000000000000)
            },
            DeviceOperationType.RECEPTION
          )
        );
        if (order?.lockers?.length > 0) {
          const lockerItems = await Promise.all(
            order.lockers.map((rcpLocker) => {
              return LockerItem.findOne({
                where: { lockerNumber: rcpLocker.locker }
              });
            })
          );
          // await this.lockerServiceManager.singleLockerManager(
          //   lockerItems.map((e) => ({
          //     id: e.lockerId,
          //     state: 2,
          //     relayNumber: e.relayNumber + 1
          //   }))
          // );
          console.log('called 858');
          this.eventEmitter.emit(
            EventsConstant.LOCKER_ASSIGNED_DEVICE,
            lockerItems.map((e) => ({
              id: e.lockerId,
              state: 2,
              relayNumber: e.relayNumber + 1
            }))
          );
        } else {
          if (
            order?.vipLocker
            //  &&
            // (order.user.roles.includes(Role.Admin) ||
            //   order.user.roles.includes(Role.Contactor) ||
            //   order.user.roles.includes(Role.User))
          ) {
            // await this.lockerServiceManager.singleLockerManager([
            //   {
            //     id: order?.vipLocker?.lockerId,
            //     state: 2,
            //     relayNumber: order?.vipLocker?.relayNumber + 1
            //   }
            // ]);
            console.log('called 882');
            this.eventEmitter.emit(EventsConstant.LOCKER_ASSIGNED_DEVICE, [
              {
                id: order?.vipLocker?.lockerId,
                state: 2,
                relayNumber: order?.vipLocker?.relayNumber + 1
              }
            ]);
          }
        }

        if (order?.lockers?.length > 0) {
          adapter.sendResult(deviceConfigUrl, {
            deviceCode: device.deviceCode,
            message: DeviceMessage.SUCCESSFUL_RCP_LOCKER(
              order.lockers.map((e) => e.locker)
            )
          });
          if (device.hasGate) {
            adapter.openGate(deviceConfigUrl, {
              deviceCode: device.deviceCode
            });
            adapter.sendResult(deviceConfigUrl, {
              deviceCode: device.deviceCode,
              message: DeviceMessage.OPEN_GATE_SUCCESSFULL
            });
            await this.deviceLogService.create({
              device,
              deviceMessage: DeviceMessage.OPEN_GATE_SUCCESSFULL,
              type: DeviceOperationType.RECEPTION,
              user,
              description: `پذیرشی با سریال ${order.id} ساخته شد و گیت مرتبط به آن باز شد`,
              identifyType
            });
          }
          await this.deviceLogService.create({
            device,
            deviceMessage: DeviceMessage.SUCCESSFUL_RCP_LOCKER(
              order.lockers.map((e) => e.locker)
            ),
            type: DeviceOperationType.RECEPTION,
            user,
            description: `سریال پذیرش ساخته شده : ${
              order?.id
            } و کمد های تخصیص داده شده : ${order.lockers
              .map((e) => e.locker)
              .join(',')}`,
            identifyType
          });

          return {
            message: DeviceMessage.SUCCESSFUL_RCP_LOCKER(
              order.lockers.map((e) => e.locker)
            )
          } as any;
        }

        if (order?.vipLocker) {
          adapter.sendResult(deviceConfigUrl, {
            deviceCode: device.deviceCode,
            message: DeviceMessage.SUCCESSFUL_RCP_LOCKER([
              order?.vipLocker?.lockerNumber
            ])
          });
          if (device.hasGate) {
            adapter.openGate(deviceConfigUrl, {
              deviceCode: device.deviceCode
            });
            adapter.sendResult(deviceConfigUrl, {
              deviceCode: device.deviceCode,
              message: DeviceMessage.OPEN_GATE_SUCCESSFULL
            });
            await this.deviceLogService.create({
              device,
              deviceMessage: DeviceMessage.OPEN_GATE_SUCCESSFULL,
              type: DeviceOperationType.RECEPTION,
              user,
              description: `پذیرشی با سریال ${order.id} ساخته شد و گیت مرتبط به آن باز شد`,
              identifyType
            });
          }
          await this.deviceLogService.create({
            device,
            deviceMessage: DeviceMessage.SUCCESSFUL_RCP_LOCKER([
              order?.vipLocker?.lockerNumber
            ]),
            type: DeviceOperationType.RECEPTION,
            user,
            description: `سریال پذیرش ساخته شده : ${order?.id} و کمد وی ای پی تخصیص داده شده : ${order?.vipLocker?.lockerNumber}`,
            identifyType
          });

          return {
            message: DeviceMessage.SUCCESSFUL_RCP_LOCKER([
              order?.vipLocker?.lockerNumber
            ])
          } as any;
        }

        adapter.sendResult(deviceConfigUrl, {
          deviceCode: device.deviceCode,
          message: DeviceMessage.SUCCESSFUL_RCP
        });

        await this.deviceLogService.create({
          device,
          deviceMessage: DeviceMessage.SUCCESSFUL_RCP,
          type: DeviceOperationType.RECEPTION,
          user,
          description: `سریال پذیرش ساخته شده : ${order?.id}`,
          identifyType
        });

        if (device.hasGate) {
          adapter.openGate(deviceConfigUrl, { deviceCode: device.deviceCode });
          adapter.sendResult(deviceConfigUrl, {
            deviceCode: device.deviceCode,
            message: DeviceMessage.OPEN_GATE_SUCCESSFULL
          });
          await this.deviceLogService.create({
            device,
            deviceMessage: DeviceMessage.OPEN_GATE_SUCCESSFULL,
            type: DeviceOperationType.RECEPTION,
            user,
            description: `پذیرشی با سریال ${order.id} ساخته شد و گیت مرتبط به آن باز شد`,
            identifyType
          });
        }

        return { message: DeviceMessage.SUCCESSFUL_RCP } as any;
      }
    );

    console.log('kashef', saleOrderResult);

    return {
      message: saleOrderResult
        ? DeviceMessage.SUCCESSFUL_RCP
        : DeviceMessage.FAILED_RCP
    };
  }

  findVipLockerUser(userId: number) {
    return SaleItem.find({
      where: {
        user: { id: userId },
        status: RegisteredServiceStatus.opened,
        type: SaleUnitType.Service,
        end: MoreThanOrEqual(new Date()),
        product: {
          isLocker: true
        }
      },
      relations: {
        saleOrder: true,
        saleUnit: true,
        product: {
          contractors: {
            contractor: true
          }
        },
        locker: true
      }
    });
  }

  selectRegisteredServiceToReception({
    adapter,
    deviceConfigUrl,
    registeredServices,
    saleUnit,
    user,
    device,
    identifyType
  }: SelectRegisteredServiceToReception) {
    console.log('multiple');
    this.eventEmitter.emit(
      EventsConstant.CLIENT_REMOTE,
      createOperationDeviceEvent(
        OperationNameDevice.MULTIPLE_RGS,
        {
          user,
          registeredServices,
          saleUnit,
          id: this.generateId(),
          type: 'action'
        },
        DeviceOperationType.RECEPTION
      )
    );
    adapter.sendResult(deviceConfigUrl, {
      deviceCode: device.deviceCode,
      message: DeviceMessage.SELECT_YOUR_RGS
    });
    this.deviceLogService.create({
      device,
      deviceMessage: DeviceMessage.SELECT_YOUR_RGS,
      type: DeviceOperationType.RECEPTION,
      user,
      description: registeredServices.map((e) => e.product.title).join(', '),
      identifyType
    });

    return { message: DeviceMessage.SELECT_YOUR_RGS } as any;
  }

  handleErrorInReceptionProcess({
    error,
    user
  }: HandleErrorInReceptionProcess) {
    console.log(error);
    this.eventEmitter.emit(
      EventsConstant.CLIENT_REMOTE,
      createOperationDeviceEvent(
        OperationNameDevice.DEVICE_ERR_OPERATION,
        {
          user,
          error: error.message,
          id: this.generateId(),
          type: 'error'
        },
        DeviceOperationType.ERROR
      )
    );
  }
}
