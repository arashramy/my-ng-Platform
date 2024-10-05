import { Inject, Injectable } from '@nestjs/common';
import { ImageHubAbstractService } from '../image-hub.abtract';
import { AdapterService as RemoveDeviceAdapterService } from '../../remote/device/adapters/adapter.service';
import { DeviceType } from '../../base/entities/AttendanceDevice';
import { Setting, SettingKey } from '../../base/entities/Setting';
import { User } from '../../base/entities/User';
import { ImageHubHelper } from '../image-hub.helper';
import { ImageHubType } from '../image-hub.module';

@Injectable()
export class PalizImageHubAdapterService extends ImageHubAbstractService {
  @Inject(RemoveDeviceAdapterService)
  private readonly deviceAdapterService: RemoveDeviceAdapterService;

  @Inject(ImageHubHelper)
  private readonly imageHubHelper: ImageHubHelper;

  async upload(usr: User, mode: string): Promise<boolean> {
    try {
      const setting = await Setting.findByKey(SettingKey.DeviceConfig);
      if (!setting) return;
      if (mode === 'INSERT') {
        await this.insertIntoPaliz(setting?.url, usr, usr.profile.name);
      } else if (mode === 'UPDATE') {
        await this.updateUserPaliz();
      } else if (mode === 'DELETE') {
        await this.deleteUserPaliz();
      }
      this.imageHubHelper.doneUploading(
        usr,
        undefined,
        'SUCCESSED',
        ImageHubType.PALIZ,
        mode
      );
      return true;
    } catch (error) {
      this.imageHubHelper.doneUploading(
        usr,
        undefined,
        'FAILED',
        ImageHubType.PALIZ,
        mode
      );
      return false;
    }
  }

  // PALIZ PROCESSOR

  async insertIntoPaliz(url: string, usr: User, filename: any) {
    const palizDeviceProvider = await this.deviceAdapterService.getAdapter(
      DeviceType.Paliz
    );
    palizDeviceProvider.connectPaliz(url);
    palizDeviceProvider.saveFace(url!, {
      memberCode: usr.code,
      memberFullName: usr.firstName.concat(' ', usr.lastName),
      image: filename
    });
  }

  async deleteUserPaliz() {}

  async updateUserPaliz() {}
}
