import { User } from '../../../base/entities/User';
import { CoreEntity } from '../../../base/entities/CoreEntity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Relation } from '../../../common/decorators/mvc.decorator';

@Relation({
  findAll: ['user', 'createdBy']
})
@Entity({ name: '_user_file_attachment' })
export class UserFileAttachment extends CoreEntity {
  @Column({ name: 'file' })
  file: string;

  @Column({ name: 'description' })
  description: string;

  @ManyToOne(() => User, (user) => user.attachments)
  @JoinColumn({ name: 'user', referencedColumnName: 'id' })
  user: User;

  @Column({ name: 'presentable' })
  presentable?: boolean;
}
