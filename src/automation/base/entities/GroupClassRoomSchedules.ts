import {Column, Entity, JoinColumn, ManyToOne} from "typeorm";
import {GroupClassRoom} from "./GroupClassRoom";
import {CoreEntity} from "../../../base/entities/CoreEntity";
import {OrganizationUnitFilter, Relation} from "../../../common/decorators/mvc.decorator";

@Relation({
    findAll: [{
        name: "groupClassRoom",
        relations: ["service", "contractor"]
    }],
    get: [],
    autoComplete: [],
})
@Entity({name: '_group_class_room_schedules'})
export class GroupClassRoomSchedules extends CoreEntity {
    @Column('json', {name: 'days', default: "[]"})
    days?: number[] = [];
    @Column('time', {name: 'from_time'})
    from?: string;
    @Column('time', {name: 'to_time'})
    to: string;
    @Column('date', {name: 'date', nullable: true})
    date?: Date;
    @OrganizationUnitFilter("organizationUnit")
    @ManyToOne(() => GroupClassRoom)
    @JoinColumn({name: 'class_room', referencedColumnName: "id"})
    groupClassRoom: GroupClassRoom;
}