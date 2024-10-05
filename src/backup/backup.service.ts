import { Inject, Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Setting, SettingKey } from '../base/entities/Setting';
import moment from 'moment';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { Backup } from './backup.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../common/constant/events.constant';
import { SmsBackupService } from '../sms/sms-backup.service';

@Injectable()
export class BackupService {
  @Inject(SchedulerRegistry)
  private readonly scheduleRegistery: SchedulerRegistry;

  @Inject(ConfigService)
  private readonly configService: ConfigService;

  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;


  @Inject(SmsBackupService)
  private readonly smsBackupService: SmsBackupService

  async createBackup() {
    const setting = await Setting.findByKey(SettingKey.BackupConfig);
    const currentTime = moment().format('HH:mm');
    const currentTimeLine = setting?.timeline?.find(
      (t) => t.when === currentTime
    );
    if (!currentTimeLine) return;
    const dbCredntials = await this._getDatabaseCredentials();
    const filename = `${currentTimeLine.where}/${new Date().getTime()}.dump`;
    exec(
      `pg_dump -U ${dbCredntials.username} -F c -f ${filename} -d ${dbCredntials.dbName}`,
      {
        env: { ...process.env, PGPASSWORD: dbCredntials.password }
      },
      async (error) => {
        if (error) {
          console.log('ERROR', error);
          await Backup.save(
            Backup.create({
              description: error?.message,
              executedDate: new Date(),
              executedTime: currentTime,
              isSuccess: false
            })
          );

          this.smsBackupService.sendBackupSms(false, currentTime);

          await this.eventEmitter.emitAsync(EventsConstant.CLIENT_REMOTE, {
            type: EventsConstant.BACKUP_NOTIFICATION,
            isSuccess: false
          });
        } else {
          console.log('CREATE');
          await Backup.save(
            Backup.create({
              executedDate: new Date(),
              executedTime: currentTime,
              isSuccess: true,
              filename
            })
          );

          await this.eventEmitter.emitAsync(EventsConstant.CLIENT_REMOTE, {
            type: EventsConstant.BACKUP_NOTIFICATION,
            isSuccess: true
          });

          this.smsBackupService.sendBackupSms(true, currentTime);
        }
      }
    );
  }

  async automaticlyRegisterBackupCronItem(setting: any, index: number = 0) {
    const time = setting?.timeline?.[index];
    if (!time) return;
    const when = time?.when;
    const where = time?.where;
    if (!(when || where)) return;
    try {
      await this.scheduleRegistery.deleteCronJob(when);
    } catch (error) {}
    const [hour, minute] = when.split(':');
    // console.log(123, hour, minute);
    const cron = new CronJob(`${minute} ${hour} * * *`, () => {
      this.createBackup();
    });
    await cron.start();
    this.scheduleRegistery.addCronJob(when, cron);
    this.automaticlyRegisterBackupCronItem(setting, index + 1);
  }

  async automaticlyRegisterBackupCron() {
    const setting = await Setting.findByKey(SettingKey.BackupConfig);
    await this.automaticlyRegisterBackupCronItem(setting);
  }

  _getDatabaseCredentials() {
    const username = this.configService.get<string>('DATASOURCE_USER');
    const password = this.configService.get<string>('DATASOURCE_PASSWORD');
    const dbName = this.configService.get<string>('DATASOURCE_DATABASE');

    return { username, password, dbName };
  }
}
