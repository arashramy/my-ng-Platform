import {Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {CoreEntity} from "../../base/entities/CoreEntity";
import {WorkGroup} from "../../base/entities/WorkGroup";
import {Role, User} from "../../base/entities/User";
import {Relation} from "../../common/decorators/mvc.decorator";
import { Audit } from '../../common/decorators/audit.decorator';


@Audit()
@Relation({
  findAll: ["user", "groups"],
  autoComplete: [],
  get: ["user", "groups"]
})
@Entity("_user_event", {schema: "public"})
export class UserEvent extends CoreEntity {
  @PrimaryGeneratedColumn({name: 'id'})
  id: number;

  @Column("varchar", {name: "title"})
  title: string;

  @Column("text", {name: "content"})
  content: string;

  @Column("boolean", {name: "dashboard", default: false})
  dashboard: boolean;

  @Column({name: "severity", default: "info"})
  severity?: 'success' | 'info' | 'warning' | 'danger';

  @ManyToMany(() => WorkGroup)
  @JoinTable({
    name: "_user_event_group", joinColumn: {
      name: 'event'
    }, inverseJoinColumn: {
      name: 'group'
    }
  })
  groups: WorkGroup[];

  @Column('json', {name: 'roles', default: '[]'})
  roles?: Role[];

  @ManyToOne(() => User)
  @JoinColumn([{name: "user", referencedColumnName: "id"}])
  user: User;

  @Column({name: 'show_time', type: 'timestamp without time zone', default: () => "now()"})
  showAt?: Date;

  @Column({name: 'expired_at', type: 'timestamp without time zone', nullable: true})
  expiredAt?: Date;
}
