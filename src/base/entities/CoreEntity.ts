import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {User} from './User';
import {Exclude} from 'class-transformer';
import {ApiProperty} from '@nestjs/swagger';

export abstract class CoreEntity extends BaseEntity {
  @Column('unsigned big int', {name: 'id'})
  @PrimaryGeneratedColumn()
  @ApiProperty({type: Number})
  id?: number;

  @UpdateDateColumn({name: 'updated_at',type:'timestamptz'})
  @ApiProperty({type: Date, readOnly: true})
  updatedAt?: Date;

  @CreateDateColumn({name: 'created_at',type:'timestamptz'})
  @ApiProperty({type: Date, readOnly: true})
  createdAt?: Date;
  @Exclude()
  @DeleteDateColumn({name: 'deleted_at',type:'timestamptz'})
  @ApiProperty({type: Date, readOnly: true})
  deletedAt?: Date;

  @ManyToOne(() => User)
  @JoinColumn({name: 'updated_by', referencedColumnName: 'id'})
  @ApiProperty({type: () => User, readOnly: true})
  updatedBy?: User;

  @ManyToOne(() => User)
  @JoinColumn({name: 'created_by', referencedColumnName: 'id'})
  @ApiProperty({type: () => User, readOnly: true})
  createdBy?: User;
  @Exclude()
  @ManyToOne(() => User)
  @JoinColumn({name: 'deleted_by', referencedColumnName: 'id'})
  @ApiProperty({type: () => User, readOnly: true})
  deletedBy?: User;
}
