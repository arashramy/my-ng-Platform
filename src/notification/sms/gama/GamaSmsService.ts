import { Injectable } from '@nestjs/common';
import {
  NotificationAbstractService,
  NotificationType
} from '../../NotificationAbstractService';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, map } from 'rxjs';
import { SettingKey } from '../../../base/entities/Setting';
import { SettingService } from '../../../common/service/setting.service';
import { NotificationTemplateDTO } from '../../NotificationService';
import {
  GamaApiResponseDTO,
  GamaBaseConfigDTO,
  GamaPatternDTO,
  GamaResponseDTO,
  GamaSendRequestDTO,
  GamaSendSmsDTO
} from './gama.dto';

@Injectable()
export class GamaSmsService extends NotificationAbstractService<
  GamaSendRequestDTO,
  NotificationTemplateDTO
> {
  constructor(
    private readonly httpService: HttpService,
    private settingService: SettingService
  ) {
    super();
  }

  async sendByTemplate(data: NotificationTemplateDTO): Promise<void> {
    const config = await this.config();
    const gamaConfigSms: GamaPatternDTO = {
      username: config?.username,
      password: config?.password,
      destination: data.mobile,
      expire: 120,
      pattern: data.templateName,
      tokens: this._convertToken(data.tokens || {})
    };
    try {
      await firstValueFrom(
        this.httpService
          .post<GamaResponseDTO<number>>(
            `${config.url}/api/v1/send/pattern`,
            gamaConfigSms
          )
          .pipe(
            map((res: any) => {
              let out: GamaApiResponseDTO;
              if (res.status == 200) {
                if (res.data?.success) {
                  if (res?.data?.body > 0) {
                    out = {
                      status: true,
                      ref: String(res?.data?.body)
                    };
                  }
                }
                console.debug(
                  'GAMA SEND REQUEST RESULT',
                  JSON.stringify(res.data)
                );
              }
              if (!out) {
                out = {
                  status: false,
                  ref: '-1'
                };
              }
              return out;
            })
          )
      );
    } catch (error) {
      console.log('err', error);
    }
  }

  async send(data: GamaSendRequestDTO): Promise<GamaApiResponseDTO> {
    const config = await this.config();
    const body: GamaSendSmsDTO = {
      username: config?.username,
      password: config?.password,
      destination: data.destination,
      message: data.message,
      source: data.source || config?.number,
      expire: data.expired
    };
    return firstValueFrom(
      this.httpService
        .post<GamaResponseDTO<number>>(`${config.url}/api/v1/send/quick`, body)
        .pipe(
          map((res: any) => {
            let out: GamaApiResponseDTO;
            if (res.status == 200) {
              if (res.data?.success) {
                if (res?.data?.body > 0) {
                  out = {
                    status: true,
                    ref: String(res?.data?.body)
                  };
                }
              }
              console.debug(
                'GAMA SEND REQUEST RESULT',
                JSON.stringify(res.data)
              );
            }
            if (!out) {
              out = {
                status: false,
                ref: '-1'
              };
            }
            return out;
          })
        )
    );
  }

  _convertToken(tokens: { [key: string]: any }) {
    return Object.keys(tokens).reduce(
      (acc, item) => [...acc, { name: item, value: tokens[item] }],
      []
    );
  }

  async getCompanyName() {
    return (await this.settingService.get(SettingKey.SystemInfo))?.title;
  }

  async config(): Promise<GamaBaseConfigDTO> {
    return this.settingService.get(this.name());
  }

  name(): NotificationType {
    return NotificationType.Gama;
  }
}
