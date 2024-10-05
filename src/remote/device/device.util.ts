import { PermissionKey } from '../../common/constant/auth.constant';
import { DeviceAdapterEvent } from './adapters/types/sse-event-payload';

export enum OperationNameDevice {
  UNABLE_TO_RECEPTION = 'UNABLE_TO_RECEPTION',
  MULTIPLE_RGS = 'MULTIPLE_RGS',
  NO_RGS = 'NO_RGS',
  AUTO_RECEPTION = 'AUTO_RECEPTION',
  NO_LOCKER = 'NO_LOCKER',
  INVALID_IP_ADDRESS_LOCKER='INVALID_IP_ADDRESS_LOCKER',
  MULTIPLE_LOCKER = 'MULTIPLE_LOCKER',
  OPEN_LOCKER = 'OPEN_LOCKER',
  SETTLE_AND_EXIT = 'SETTLE_AND_EXIT',
  EXIT = 'EXIT',
  DEVICE_ERR_OPERATION = 'DEVICE_ERR_OPERATION',
  SELECT_CONTRACTOR_RECEPTION = 'SELECT_CONTRACTOR_RECEPTION',
  SELECT_LOCKER = 'SELECT_LOCKER',
  SELECT_PRODUCT_SHOP = 'SELECT_PRODUCT_SHOP',
  DEVICE_NOTIFICATION_TRAFFIC = 'DEVICE_NOTIFICATION_TRAFFIC',
  FILLED_VIP_ERROR = 'FILLED_VIP_ERROR',
  NO_RECEPTION_OPEN_GATE = 'NO_RECEPTION_OPEN_GATE',
  OPEN_GATE_SUCCESSFULL = 'OPEN_GATE_SUCCESSFULLY',
  NO_RECEPTION_EXIST = 'NO_RECEPTION_EXIST',
  NO_ENOUGH_CREDIT_CHARGING_SERVICE = 'NO_ENOUGH_CREDIT_CHARGING_SERVICE',
  MULTIPLE_CHARGING_SERVICE = 'MULTIPLE_CHARGING_SERVICE',
  UNPAID_INSTALLMENT_LOAN = 'UNPAID_INSTALLMENT_LOAN',
  INVALID_LOGOUT_UNFAIR='INVALID_LOGOUT_UNFAIR',
   UNFAIR_USAGE_PENALTY='UNFAIR_USAGE_PENALTY',
   
}

export enum DeviceOperationType {
  REGISTERED_SERVICE = 'REGISTERED_SERVICE',
  LOCKER = 'LOCKER',
  RECEPTION = 'RECEPTION',
  ERROR = 'ERROR',
  EXIT = 'EXIT',
  SHOP = 'SHOP',
 
}

export const createOperationDeviceEvent = (
  operationName: OperationNameDevice,
  operationData: any,
  type: DeviceOperationType
): DeviceAdapterEvent => {
  return {
    key: PermissionKey.BASE_ATTENDANCE_DEVICE,
    payload: {
      operationName,
      operationData,
      type
    }
  };
};

export const getConfigUrl = (configs: any, key: string) =>
  configs.find((e) => e.key === key)?.value;
