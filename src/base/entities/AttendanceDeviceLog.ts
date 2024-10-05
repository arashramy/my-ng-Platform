import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CoreEntity } from './CoreEntity';
import { User } from './User';
import { AttendanceDevice } from './AttendanceDevice';
import { Relation } from '../../common/decorators/mvc.decorator';

@Relation({ findAll: ['device', 'user'] })
@Entity({ name: '_attendance_device_log' })
export class AttendanceDeviceLog extends CoreEntity {
  @ManyToOne(() => User, (user) => user.deviceLogs)
  @JoinColumn({ name: 'user' })
  user: User;

  @ManyToOne(() => AttendanceDevice, (device) => device.logs)
  @JoinColumn({ name: 'device' })
  device: AttendanceDevice;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @Column({ name: 'device_message', type: 'varchar', nullable: true })
  deviceMessage: string;

  @Column({ name: 'type', type: 'varchar', length: 100, nullable: true })
  type: string;

  @Column({
    name: 'identify_type',
    type: 'varchar',
    length: 100,
    nullable: true
  })
  identifyType: string;
}
