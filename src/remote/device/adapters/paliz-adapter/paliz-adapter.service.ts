import { Injectable } from '@nestjs/common';
import { RemoveDeviceAdapterService } from '../adapeter-abstract.service';
import { createClientAsync } from 'soap';

@Injectable()
export class PalizAdapterService implements RemoveDeviceAdapterService {
  public async print<T, E extends object>(config: any, payload: E): Promise<T> {
    const connection = await this.connectPaliz(config);
    return connection.PrintAsync(payload);
  }
  public async connectPaliz(config: any) {
    return createClientAsync(config);
  }

  public async saveFingerPrint<T, E extends object>(
    config: any,
    payload: E
  ): Promise<T> {
    const connection = await this.connectPaliz(config);
    return connection.Paliz_SaveFingerPrintAsync(payload);
  }
  public async saveCardNumber<T, E extends object>(
    config: any,
    payload: E
  ): Promise<T> {
    const connection = await this.connectPaliz(config);
    return connection.Paliz_SaveCardNumberAsync(payload);
  }
  public async sendResult<T, E extends object>(
    config: any,
    payload: E
  ): Promise<T> {
    const connection = await this.connectPaliz(config);
    return connection.Paliz_GetResultAsync(payload);
  }
  public async saveFace<T, E extends object>(
    config: any,
    payload: E
  ): Promise<T> {
    const connection = await this.connectPaliz(config);
    return connection.Paliz_SaveFaceAsync(payload);
  }

  public async openGate<T, E extends object>(
    config: any,
    payload: E
  ): Promise<T> {
    const connection = await this.connectPaliz(config);
    return connection.OpenGateAsync(payload);
  }
}
