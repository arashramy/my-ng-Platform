import { Inject, Injectable } from '@nestjs/common';
import { ImageHubAbstractService } from '../image-hub.abtract';
import { User } from '../../base/entities/User';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { Setting, SettingKey } from '../../base/entities/Setting';
import { ImageHubHelper } from '../image-hub.helper';
import { ImageHubType } from '../image-hub.module';

@Injectable()
export class GhadirImageHubAdapterService extends ImageHubAbstractService {
  @Inject(ConfigService)
  private readonly configService: ConfigService;

  @Inject(HttpService)
  private readonly httpClient: HttpService;

  @Inject(ImageHubHelper)
  private readonly imageHubHelper: ImageHubHelper;

  async upload(usr: User, mode: string): Promise<boolean> {
    const identificationConfig = await this.getIdentificationConfig();
    try {
      if (mode === 'INSERT') {
        await this.insertIntoGhadir(
          usr,
          identificationConfig.callerCode,
          identificationConfig.url
        );
      } else if (mode === 'UPDATE') {
        await this.updateUserGhadir();
      } else if (mode === 'DELETE') {
        await this.deleteUserGhadir();
      }
      this.imageHubHelper.doneUploading(
        usr,
        identificationConfig.callerCode,
        'SUCCESSED',
        ImageHubType.GHADIR,
        mode
      );
      return true;
    } catch (error) {
      this.imageHubHelper.doneUploading(
        usr,
        identificationConfig.callerCode,
        'FAILED',
        ImageHubType.GHADIR,
        mode
      );
      return false;
    }
  }

  getImageFromDisk(name: string) {
    return fs.createReadStream(
      path.join(this.configService.get<string>('MEDIA_PATH'), name)
    );
  }

  prepareData(usr: User, callerCode: string) {
    const data = new FormData();
    data.append('image_file', this.getImageFromDisk(usr.profile.name));
    data.append('callercode', callerCode);
    data.append('first_name', usr.firstName);
    data.append('last_name', usr.lastName);
    data.append('UserCode', usr.id);
    data.append('tag', '1');
    return data;
  }

  storeImageOnProvider(data: FormData, providerUrl: string) {
    return firstValueFrom(this.httpClient.post(providerUrl, data));
  }

  getIdentificationConfig() {
    return Setting.findByKey(SettingKey.IdentificationConfig);
  }

  // GHADIR PROCESSOR

  async insertIntoGhadir(usr: User, callerCode: string, url: string) {
    const data = this.prepareData(usr, callerCode);
    await this.storeImageOnProvider(data, url);
  }

  async updateUserGhadir() {}

  async deleteUserGhadir() {}
}
