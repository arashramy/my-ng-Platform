import { In } from 'typeorm';
import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Put,
  UseGuards
} from '@nestjs/common';
import { Setting, SettingKey } from '../entities/Setting';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../entities/User';
import { AccessTokenGuard } from '../../auth/guard/access-token.guard';
import { SettingService } from '../../common/service/setting.service';
import { BackupService } from '../../backup/backup.service';

@Controller('/api/setting')
export class SettingController {
  constructor(
    private settingService: SettingService,
    private readonly backupService: BackupService
  ) {}

  @Get('/')
  async defaultConfig() {
    let settings: Setting[] = await Setting.find({
      where: { key: In([SettingKey.SystemConfig, SettingKey.ThemeConfig]) },
      cache: true
    });
    return {
      config: settings.find((item) => item.key == SettingKey.SystemConfig)
        ?.value,
      theme: settings.find((item) => item.key == SettingKey.ThemeConfig)?.value
    };
  }

  @Get('/:key')
  // @UseGuards(AccessTokenGuard)
  async get(@Param('key') key: SettingKey) {
    let setting = await this.settingService.get(key);
    return setting || {};
  }

  @Put('/:key')
  @UseGuards(AccessTokenGuard)
  async edit(
    @Param('key') key: SettingKey,
    @Body() config: any,
    @CurrentUser() current: User
  ) {
    let configEntity = await Setting.findOneBy({ key: key });
    if (!configEntity) {
      configEntity = new Setting();
      configEntity.key = key;
      configEntity.createdBy = current;
    } else {
      configEntity.updatedBy = current;
    }
    configEntity.value = config;
    try {
      let result = await Setting.save(configEntity);
      await this.settingService.set(key, config);
      if (result.key === SettingKey.BackupConfig) {
        this.backupService.automaticlyRegisterBackupCron();
      }
      return result.value;
    } catch (e) {
      throw new InternalServerErrorException(e.message);
    }
  }
}
