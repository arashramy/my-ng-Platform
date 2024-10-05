import { Relation } from '../../common/decorators/mvc.decorator';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
} from 'typeorm';
import { AttendanceDevice } from './AttendanceDevice';
import { CoreEntity } from './CoreEntity';
import { User } from './User';
import { Audit } from '../../common/decorators/audit.decorator';

// export enum SignUserEnum {
//   CARD = 'CARD',
//   FINGER = 'FINGER',
// }

export enum SignStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVE = 'DEACTIVE',
}

@Audit()
@Relation({
  findAll: ['device', 'user'],
  get: ['device', 'user'],
  autoComplete: [],
})
@Entity({ name: '_sign_user' })
export class SignUser extends CoreEntity {
  @Column({ type: 'varchar', nullable: true, default: '' })
  card?: string;

  // @ManyToMany(() => AttendanceDevice, (device) => device.id)
  // @JoinTable({
  //   name: '_device_user',
  //   inverseJoinColumn: {
  //     name: 'attendance_device',
  //     foreignKeyConstraintName: 'id',
  //   },
  //   joinColumn: {
  //     name: 'user',
  //     foreignKeyConstraintName: 'id',
  //   },
  // })
  // device: AttendanceDevice[];

  @OneToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user', referencedColumnName: 'id' })
  user: User;

  @Column({ name: 'status', type: 'varchar', default: SignStatus.ACTIVE })
  status: SignStatus;

  @Column({ name: 'finger_sample_1', type: 'text', default: '' })
  fingerSample1?: string;

  @Column({ name: 'finger_sample_2', type: 'text', default: '' })
  fingerSample2?: string;
}
