import {Lockerstate} from '../../../automation/operational/entities/LockerItem';

export interface ISingleLockerType {
  id: number;
  relayNumber: number;
  state: Lockerstate;
  saleUnit?: number;
}
