import { INestApplication, Injectable } from '@nestjs/common';
import aedes from 'aedes';
import { createServer } from 'websocket-stream';
import { CommandHandlerService } from './command-handler.service';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsConstant } from '../../common/constant/events.constant';

export enum Topics {
  TOKEN = '/user/token',
  SEND_LOCKER = '/send/locker',
  RECEIVE_LOCKER = '/receive/locker',
  TOKEN_CHECK = 'TOKEN_CHECK',
  SEND_FINGERPRINT = '/send/request/fingerprint',
  RECEIVE_FINGERPRINT = '/receive/fingerprint',
  RECEIVE_CARD = '/receive/card',
  SEND_CARD = '/send/request/card',
  SEND_OK = '/send/ok',
  SEND_MEMBER_OPERATION = '/send/member/operation',
  RESULT_MEMBER_OPERATION = '/result/member/operation',
  SEND_RECEPTION_USER = '/send/reception/user',
  FEEDBACK_RECEPTION = '/feedback/reception',
  SELECT_REGISTER = '/select/register'
}

@Injectable()
export class MqttBrokerService {
  server_mqtt: any;

  constructor(private commandHandler: CommandHandlerService) {}

  async init(app: INestApplication) {
    this.server_mqtt = new aedes({
      authenticate: this.authenticate,
      authorizePublish: this.authorizePublish,
      authorizeSubscribe: this.authorizeSubscribe,
      published: this.received,
      concurrency: 10,
      heartbeatInterval: 5000
    });

    this.server_mqtt.on('client', function (client: any) {
      console.log('client connected', client.id);
    });

    this.server_mqtt.on('clientError', (client, error) => {
      console.log(error);
    });
    this.server_mqtt.on('connectionError', (client, error) => {
      console.log(error);
    });

    // createServer({ server: app }, this.server_mqtt.handle);
  }

  received = async (packet: any, client: any) => {
    let result: any = await this.commandHandler.handle(
      packet.topic,
      packet.payload
    );
    if (result && result.topic) {
      this.publish(result.topic, {
        ...result.data,
        timestamp: new Date().getTime()
      });
    }
  };

  @OnEvent(EventsConstant.MQTT_SEND)
  onPublishMessage(value: { topic: string; data: any }) {
    this.publish(value.topic, value.data);
  }

  publish = (topic: string, data: any, qos: any = 2, retain = false) => {
    if (this.server_mqtt) {
      this.server_mqtt.publish(
        {
          cmd: 'publish',
          dup: false,
          topic: topic,
          payload: JSON.stringify(data),
          qos: qos,
          retain: retain
        },
        (obj) => {}
      );
    }
  };

  close = () => {
    if (this.server_mqtt && !this.server_mqtt.closed) {
      this.server_mqtt.close(() => {
        console.log('mqtt server is closed.');
      });
    }
  };

  authenticate = async (client: any, username, password, callback) => {
    console.log('authentication');
    // if (password) {
    //   let check = await this.commandHandler.handle(
    //     Topics.TOKEN_CHECK,
    //     password,
    //   );
    //   if (!check) {
    //     callback(
    //       {
    //         name: 'BAD_USERNAME_OR_PASSWORD',
    //         message: 'BAD_USERNAME_OR_PASSWORD',
    //         returnCode: 4,
    //       },
    //       false,
    //     );
    //   }
    // } else {
    //   callback(
    //     {
    //       name: 'BAD_USERNAME_OR_PASSWORD',
    //       message: 'BAD_USERNAME_OR_PASSWORD',
    //       returnCode: 4,
    //     },
    //     false,
    //   );
    // }
    callback(null, true);
  };

  authorizePublish = (client: any, packet: any, callback) => {
    callback(null);
  };

  authorizeSubscribe = (client: any, subscription, callback) => {
    callback(null, subscription);
  };
}
