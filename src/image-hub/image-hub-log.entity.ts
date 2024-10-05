import { Column, Entity, ManyToOne, RelationId } from 'typeorm';
import { ImageHubType } from './image-hub.module';
import { User } from '../base/entities/User';
import { CoreEntity } from '../base/entities/CoreEntity';
import { Relation } from '../common/decorators/mvc.decorator';

@Relation({
  findAll: ['user', 'createdBy']
})
@Entity({ name: '_image_hub_log' })
export class ImageHubLog extends CoreEntity {
  @Column({ name: 'caller_code', type: 'varchar', nullable: true })
  callerCode?: string;

  @Column({ name: 'type', enum: ImageHubType })
  type: ImageHubType;

  @ManyToOne(() => User, (user) => user.id)
  user: User;

  @RelationId((imageHub: ImageHubLog) => imageHub.user)
  userId: number;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'submited_at', type: Date, default: new Date() })
  submitedAt: Date;

  @Column({ name: 'mode', type: 'varchar' })
  mode: string;
}
