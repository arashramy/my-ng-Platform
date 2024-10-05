import { Injectable } from '@nestjs/common';
import { RemoteTokenService } from './remote-token.service';
import { LockerService } from '../locker-manager/service/locker.service';
import { Topics } from './mqtt-broker.service';

@Injectable()
export class CommandHandlerService {
  constructor(
    private remoteTokenService: RemoteTokenService,
    private lockerService: LockerService,
  ) {}

  async handle(topic: string, payload: any): Promise<any> {
    switch (topic) {
      case Topics.RECEIVE_LOCKER:
        const { status, data, timestamp } = JSON.parse(payload.toString());
        if (timestamp && new Date().getTime() - timestamp > 300000) {
          console.log('timestamp', new Date().getTime() - timestamp);
          return null;
        }
        if (status === 'single') {
          this.lockerService.updateArrayLocker(data);
        } else if (status === 'all') {
          this.lockerService.updateAllLocker(data);
        }
        return null;
      case Topics.TOKEN:
        return {
          topic: 'salam',
          data: {
            token: await this.remoteTokenService.generateToken(),
          },
        };
      case Topics.TOKEN_CHECK:
        return (
          (await this.remoteTokenService.getToken())?.value?.data.toString() ==
          payload.toString()
        );
    }
  }
}
