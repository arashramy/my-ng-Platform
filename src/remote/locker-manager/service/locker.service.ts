import { Injectable } from '@nestjs/common';
import {
  LockerItem,
  Lockerstate,
} from '../../../automation/operational/entities/LockerItem';
import { IReceiveAllLocker } from '../types/receive-locker.type';
import { ISingleLockerType } from '../types/single-locker.interface';
import { Locker } from '../../../automation/base/entities/Locker';

@Injectable()
export class LockerService {
  getLocker() {
    return Locker.find({ where: {}, relations: ['items'] });
  }

  getLockerBasedOnLockerNumber(lockerNumber: number) {
    return Locker.findOne({ where: { items: { lockerNumber } } });
  }

  updateArrayLocker(data: ISingleLockerType[]) {
    data.map(async (el: ISingleLockerType) => {
      const update: {
        state: Lockerstate;
      } = {
        state: el.state,
      };
      await LockerItem.update(
        { relayNumber: el.relayNumber, locker: el.id as any },
        update,
      );
    });
  }

  updateAllLocker(data: IReceiveAllLocker) {
    LockerItem.update((data.id as any) ? { locker: data.id } : {}, {
      state: data.toggle,
    });
  }
}
