import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: '_backup' })
export class Backup extends BaseEntity {
  @Column({ name: 'id', type: 'unsigned big int' })
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'executed_date', type: 'date' })
  executedDate: Date;

  @Column({ name: 'executed_time', type: 'varchar' })
  executedTime: string;

  @Column({ name: 'file_name', type: 'varchar', nullable: true })
  filename: string;

  @Column({ name: 'is_success', type: 'boolean' })
  isSuccess: boolean;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;
}
