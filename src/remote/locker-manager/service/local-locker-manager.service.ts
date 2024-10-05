import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ILockerManagerService } from '../locker-manager-service';
import { ISingleLockerType } from '../types/single-locker.interface';
import formData from 'form-data';
import {
  LockerItem,
  Lockerstate
} from '../../../automation/operational/entities/LockerItem';
import { Locker } from '../../../automation/base/entities/Locker';
import { firstValueFrom } from 'rxjs';
import { IsNull } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';
import {
  createOperationDeviceEvent,
  DeviceOperationType,
  OperationNameDevice
} from '../../device/device.util';
import { DeviceMessage } from '../../device/device.constant';

@Injectable()
export class LocalLockerManagerService implements ILockerManagerService {
  constructor(
    private readonly http: HttpService,
    private eventEmitter: EventEmitter2
  ) {}

  async singleLockerManager(data: ISingleLockerType[]) {
    let index = 0;

    const recursive = async (element) => {
      if (!element) return;
      console.log("element",element)
      try {
        const locker: Locker = await Locker.findOne({
          where: { id: element.id, deletedAt: IsNull() }
        });

        if (!locker.ipAddress) return;

        await firstValueFrom(
          this.http.post(
            `http://${locker.ipAddress}:${locker.port}/SetRelayStatus`,
            {
              RelayNo: element.relayNumber,
              RelayWorkMode: element.state,
              RelayDelayTime: locker?.relayDelayTime || 0,
              RelayOnTime: locker?.relayOnTime || 0
            },
            {
              auth: {
                username: process.env.LOCKER_USERNAME,
                password: process.env.LOCKER_PASSWORD
              },
            }
          )
        )
          .then(async (z) => {
            console.log('dataaaaaaaaaa', z);
            const update: {
              state: Lockerstate;
            } = {
              state: element.state
            };
            await LockerItem.update(
              { relayNumber: element.relayNumber, locker: element.id as any },
              update
            ),
              setTimeout(() => {
                ++index;
                return recursive(data[index]);
              }, 500);
          })
          .catch((e) => {
            console.log(
              'something wrong',
              e.message,
              DeviceMessage.INVALID_IP_ADDRESS_LOCKE(
                element.relayNumber,
                locker.ipAddress
              )
            );
            this.eventEmitter.emit(
              EventsConstant.CLIENT_REMOTE,
              createOperationDeviceEvent(
                OperationNameDevice.INVALID_IP_ADDRESS_LOCKER,
                {
                  user: null,
                  id: Math.floor(Math.random() * 1000000000000),
                  type: 'action',
                  message: DeviceMessage.INVALID_IP_ADDRESS_LOCKE(
                    locker.title,
                    locker.ipAddress
                  ),
                  locker: locker
                },
                DeviceOperationType.RECEPTION
              )
            );
          });
      } catch (error) {
        console.log('error', error);
      }
    };
    await recursive(data[index]);
    console.log('sssssssssssssssss', data[index]);
  }

  async allLockerManager(toggle: number, id: number) {
    let ip_address, port;
    let result;
    if (id) {
      const locker = await Locker.findOne({ where: { id } });
      ip_address = locker.ipAddress;
      port = locker.port;
    }
    const x = new formData();
    x.append('RelaysStat', toggle);
    console.log(toggle);
    try {
      result = await firstValueFrom(
        this.http.post(
          `http://${ip_address}:${port}/SetAllRelayStatus`,
          x.getBuffer(),
          {
            auth: {
              username: process.env.LOCKER_USERNAME,
              password: process.env.LOCKER_PASSWORD
            }
          }
        )
      );
      await LockerItem.update(id ? { locker: id as any } : {}, {
        state: toggle === 0 ? 0 : 1
      });
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('');
    }
  }
}
