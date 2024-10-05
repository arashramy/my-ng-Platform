import {
  BaseEntity,
  Column, CreateDateColumn,
  Entity, ILike,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DefaultSort, GlobalFilter, Relation } from '../../common/decorators/mvc.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../base/entities/User';
import { jsonTransformer } from '../../common/typeorm/converter/json-transformer';

export enum AuditType {
  Insert = 'Insert',
  Update = 'Update',
  Delete = 'Delete',
}

@Relation({
  findAll: ['createdBy'],
  get: [],
  autoComplete: [],
})
@Entity({ name: '_entity_audit_log', schema: 'public' })
export class EntityAuditLog extends BaseEntity {
  @DefaultSort('DESC')
  @Column('unsigned big int', { name: 'id' })
  @PrimaryGeneratedColumn()
  id?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })

  @ApiProperty({ type: Date, readOnly: true })
  createdAt?: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by', referencedColumnName: 'id' })
  @ApiProperty({ type: () => User, readOnly: true })
  createdBy?: User;

  @GlobalFilter({ where: (params) => ILike(`%${params}%`) })
  @Column({ name: 'entity' })
  entity?: string = '';

  @Column('varchar', { name: 'entity_id' })
  entityId: string;

  @Column({ name: 'audit_type', enum: AuditType, default: AuditType.Update })
  type?: AuditType = AuditType.Update;

  @Column('json', { name: 'previous_value', nullable: true })
  previousValue?: any;

  @Column('json', { name: 'after_value', nullable: true })
  afterValue?: any;
}
