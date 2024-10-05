import { DeviceOperationType } from '../../device.util';

export interface DeviceAdapterEvent {
  key: string;
  payload: {
    operationName: string;
    operationData: any;
    type: DeviceOperationType;
  };
}
