import { LocalLockerManagerService } from './locker-manager/service/local-locker-manager.service';
import { RemoteLockerManagerService } from './locker-manager/service/remote-locker-manager.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { MqttBrokerService } from './service/mqtt-broker.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export const LockerManagerServiceProvider = {
  provide: 'LockerManagerService',
  inject: [ConfigService, HttpService, MqttBrokerService,EventEmitter2],
  useFactory: (
    configService: ConfigService,
    httpService: HttpService,
    mqttGateway: MqttBrokerService,
    eventEmitter:EventEmitter2
  ) => {
    return configService.get('LOCKER_MANAGER_TYPE') === 'local'
      ? new LocalLockerManagerService(httpService,eventEmitter)
      : new RemoteLockerManagerService(mqttGateway);
  },
};
