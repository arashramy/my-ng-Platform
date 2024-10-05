import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { Locker } from '../../base/entities/Locker';
import { IsNotEmpty } from 'class-validator';
import { Export } from '../../../common/decorators/export.decorator';

export enum LockerStatus {
  disabled,
  Locked,
  Released
}

export enum Lockerstate {
  Locked = 0,
  Released = 1,
  withDelay = 2
}

export enum LockerType {
  simple,
  vip
}

@Export<LockerItem>({
  name: 'LockerItem',
  translateKey: 'LockerItems',
  columns: {
    status: { transform: (obj) => (obj.status ? 'On' : 'Off') },
    state: {
      transform: (obj) => {
        'lockerItem' + LockerStatus[obj.state];
      }
    }
  }
})
@Entity({ name: '_locker_item' })
export class LockerItem extends CoreEntity {
  @IsNotEmpty()
  @Column({ name: 'locker_number' })
  lockerNumber?: number = 1;

  @IsNotEmpty()
  @Column({ name: 'relay_number' })
  relayNumber?: number = 1;

  @Column({ name: 'priority', default: 0 })
  priority?: number = 0;

  @Column('int', { name: 'type', default: 0 })
  type: LockerType = LockerType.simple;

  @Column({ name: 'status', default: true })
  status: boolean;

  @ManyToOne(() => Locker, (locker) => locker.items)
  @JoinColumn({ name: 'locker', referencedColumnName: 'id' })
  locker: Locker;

  @Column({ name: 'state', enum: Lockerstate, default: Lockerstate.Locked })
  state: Lockerstate;

  @RelationId((locker: LockerItem) => locker.locker)
  lockerId: number;
}
