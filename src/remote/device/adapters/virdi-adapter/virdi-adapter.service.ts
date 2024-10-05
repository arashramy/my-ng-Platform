import { Injectable, NotImplementedException } from '@nestjs/common';
import { RemoveDeviceAdapterService } from '../adapeter-abstract.service';

@Injectable()
export class VirdiAdapterService implements RemoveDeviceAdapterService {
  public print<T, E extends object>(config: any, payload: E): Promise<T> {
    throw new Error('Method not implemented.');
  }
  public saveFace<T, E extends object>(config: any, payload: E): Promise<T> {
    throw new NotImplementedException('Not Implement Yet');
  }
  public async saveFingerPrint<T, E extends object>(payload: E): Promise<T> {
    throw new NotImplementedException('Not Implement Yet');
  }
  public async saveCardNumber<T, E extends object>(payload: E): Promise<T> {
    throw new NotImplementedException('Not Implement Yet');
  }
  public async sendResult<T, E extends object>(payload: E): Promise<T> {
    throw new NotImplementedException('Not Implement Yet');
  }
  public async openGate<T, E extends object>(
    config: any,
    payload: E
  ): Promise<T> {
    throw new NotImplementedException('Not Implement Yet');
  }
}
