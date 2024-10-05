import {Column, Entity, JoinColumn, ManyToOne} from "typeorm";
import {CoreEntity} from "./CoreEntity";
import {ShiftWork} from "./ShiftWork";


@Entity({name: '_shift_work_schedule'})
export class ShiftWorkSchedule extends CoreEntity {
    @Column('json', {name: 'days', default: "[]"})
    days?: number[] = [];
    @Column('time', {name: 'from_time'})
    from?: string;
    @Column('time', {name: 'to_time'})
    to: string;
    @ManyToOne(() => ShiftWork)
    @JoinColumn({name: 'shift_work', referencedColumnName: "id"})
    shift: ShiftWork;
}