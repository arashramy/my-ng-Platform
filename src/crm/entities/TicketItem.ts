import {Column, Entity, JoinColumn, ManyToOne, RelationId} from "typeorm";
import {CoreEntity} from "../../base/entities/CoreEntity";
import {WorkGroup} from "../../base/entities/WorkGroup";
import {User} from "../../base/entities/User";
import {Ticket} from "./Ticket";
import {Media} from "../../base/dto/image.dto";


@Entity("_ticket_item", {schema: "public"})
export class TicketItem extends CoreEntity {

  @Column("text", {name: "content"})
  content: string;

  @Column("boolean", {name: "forward", default: false})
  forward: boolean;

  @Column("integer", {name: "rate", nullable: true})
  rate: number;

  @Column("boolean", {name: "is_answer", default: false})
  isAnswer: boolean;

  @ManyToOne(() => WorkGroup)
  @JoinColumn([{name: "target_group", referencedColumnName: "id"}])
  targetGroup: WorkGroup;

  @ManyToOne(() => WorkGroup)
  @JoinColumn([{name: "group", referencedColumnName: "id"}])
  group: WorkGroup;

  @ManyToOne(() => User)
  @JoinColumn([{name: "user", referencedColumnName: "id"}])
  user: User;

  @ManyToOne(() => Ticket)
  @JoinColumn([{name: "ticket", referencedColumnName: "id"}])
  ticket: Ticket;

  @RelationId((t: TicketItem) => t.ticket)
  ticketId?: number;

  @Column('json', {name: 'attachments', default: "[]"})
  attachments?: Media[];
}
