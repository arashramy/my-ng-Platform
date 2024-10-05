import {ISingleLockerType} from './types/single-locker.interface';

export interface ILockerManagerService {
  singleLockerManager(data: ISingleLockerType[]): void;

  allLockerManager(toggle: number, id?: number): void;
}
