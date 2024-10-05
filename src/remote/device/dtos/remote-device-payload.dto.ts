import { AttendanceDevice } from '../../../base/entities/AttendanceDevice';
import { FiscalYear } from '../../../base/entities/FiscalYears';
import { User } from '../../../base/entities/User';

export interface RemoteDevicePayload {
  user: User;
  device: AttendanceDevice;
  fiscalYear?: FiscalYear;
}
