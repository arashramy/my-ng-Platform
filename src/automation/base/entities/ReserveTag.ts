import { Column, Entity } from 'typeorm';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { Transform } from 'class-transformer';

@Entity({ name: '_reserve_tag' })
export class ReserveTag extends CoreEntity {
  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'start_time', type: 'varchar' })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar' })
  endTime: string;

  @Column({ name: 'duration', type: 'integer' })
  @Transform((data) => {
    return +data.value;
  })
  duration: number;

  @Column({ name: 'unit', type: 'varchar', nullable: true })
  unit?: string;
}
