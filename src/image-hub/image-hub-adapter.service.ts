import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Setting, SettingKey } from '../base/entities/Setting';
import { EventsConstant } from '../common/constant/events.constant';
import { ModuleRef } from '@nestjs/core';
import { ImageHubAbstractService } from './image-hub.abtract';
import { User } from '../base/entities/User';

@Injectable()
export class ImageHubAdapterService {
  @Inject(ModuleRef)
  private readonly module: ModuleRef;

  @OnEvent(EventsConstant.IMAGE_HUB_UPLOADER)
  async imageUploadEvent({ data, mode }: { data: User; mode: string }) {
    const adapter = await this.getAdapter();
    await adapter?.upload(data, mode);
  }

  async getAdapter() {
    const setting = await Setting.findByKey(SettingKey.ImageHubType);
    const imageHubType = setting?.type;
    if (!imageHubType) return;
    const provider: ImageHubAbstractService = await this.module.get(
      `IMAGE_HUB_${imageHubType}`
    );
    return provider;
  }
}
