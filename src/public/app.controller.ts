import { Controller, Get, Post, Render, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SettingService } from '../common/service/setting.service';
import { SseService } from '../common/sse/sse.service';
import {
  NotificationMessageTemplate,
  NotificationService
} from '../notification/NotificationService';
import { EventsConstant } from '../common/constant/events.constant';
import { ConfigService } from '@nestjs/config';
import { Setting, SettingKey } from '../base/entities/Setting';
import { LockerItem } from 'src/automation/operational/entities/LockerItem';
import { ReceptionLocker } from 'src/automation/operational/entities/ReceptionLocker';

const versionDescriptionsJson = require('../../versionDescription.json');

@Controller()
export class AppController {
  constructor(
    private appService: SettingService,
    private eventEmitter: EventEmitter2,
    private sseService: SseService,
    private config: ConfigService,
    private readonly notificationService: NotificationService
  ) {}

  @Get()
  @Render('index.html')
  async indexPage() {
    return this.appService.getDefaults();
  }

  @Post('mail/health-check')
  async mailHealthCheck() {
    await this.eventEmitter.emitAsync(EventsConstant.SMS_NOTIFICATION, {
      text: 'Hello New Test, Welcome Please',
      subject: 'Varzeshsoft Have Notification For You',
      receiver: 'cody20v@gmail.com',
      templateName: NotificationMessageTemplate.OTP,
      datas: {
        todos: [
          {
            id: 1,
            title: 'Learn React'
          },
          {
            id: 2,
            title: 'Learn Angular'
          }
        ]
      }
    });
  }

  @Get('/api/server-time')
  async serverTime() {
    return new Date();
  }

  @Sse('remote/changed')
  connectSSe(): Observable<any> {
    return this.sseService.subject.asObservable();
  }

//   @Post('fix')
//   async fixSettingkey(){
//   //  return await Setting.create({key:SettingKey.IpStatic,value:JSON.stringify('http://192.168.1.148:2040/')})
//     return await Setting.findByKey(SettingKey.OnlineSetting)
// }



  @Get('/api/version')
  async version() {
    let versionDescriptionsList: {
      version: string;
      type: 'frontend' | 'backend';
      descriptions: string[];
      date: string;
    }[] = [];
    Object.entries(versionDescriptionsJson).forEach(([major, majorValue]) => {
      Object.entries(majorValue).forEach(([minor, minorValue]) => {
        Object.entries(
          minorValue as Record<string, { descriptions: string[]; date: string }>
        ).forEach(([bug, versionValue]) => {
          versionDescriptionsList.push({
            version: `${major}.${minor}.${bug}`,
            type: 'backend',
            descriptions: versionValue.descriptions,
            date: versionValue.date
          });
        });
      });
    });

    return {
      version: this.config.get('BACKEND_VERSION'),
      versionsHistory: versionDescriptionsList
    };
  }
}

//
