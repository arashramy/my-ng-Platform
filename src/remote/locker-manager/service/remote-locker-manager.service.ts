import {Injectable} from '@nestjs/common';
import {MqttBrokerService, Topics} from '../../service/mqtt-broker.service';
import {ILockerManagerService} from '../locker-manager-service';
import {ISingleLockerType} from '../types/single-locker.interface';

@Injectable({})
export class RemoteLockerManagerService implements ILockerManagerService {
  constructor(private mqttGateway: MqttBrokerService) {
  }

  async singleLockerManager(data: ISingleLockerType[]) {
    this.mqttGateway.publish(Topics.SEND_LOCKER, {
      data,
      status: 'single',
      timestamp: new Date().getTime(),
    });
  }

  async allLockerManager(toggle: number, id?: number) {
    const data: { id?: number; toggle: number } = {
      toggle: toggle === 0 ? 0 : 1,
    };
    if (id) {
      data.id = id;
    }
    this.mqttGateway.publish(Topics.SEND_LOCKER, {
      data,
      status: 'all',
      timestamp: new Date().getTime(),
    });
  }
}


//relayonTime delayTime ro lpcker 
//mqtt tsghir electron
//env guard moteghir
//redis config validation token\
//nginx ro docker proxy docker
