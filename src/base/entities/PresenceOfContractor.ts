import {Column, Entity, JoinColumn, ManyToOne} from "typeorm";
import {User} from "./User";
import {OrganizationUnitBaseEntity} from "./OrganizationUnitBaseEntity";

@Entity({name: '_presence_of_contractor'})
export class PresenceOfContractor extends OrganizationUnitBaseEntity {
    @Column('json', {name: 'days', default: "[]"})
    days?: number[] = [];
    @Column('time', {name: 'from_time'})
    from?: string;
    @Column('time', {name: 'to_time'})
    to: string;
    @ManyToOne(() => User)
    @JoinColumn({name: 'user', referencedColumnName: "id"})
    user: User;
}