import {Column, Entity, JoinColumn, ManyToOne} from "typeorm";
import {CoreEntity} from "./CoreEntity";
import {ShiftWork} from "./ShiftWork";


@Entity({name: '_shift_work_calendar'})
export class ShiftWorkCalendar extends CoreEntity {
    @Column('date', {name: 'date'})
    date?: Date;
    @Column('time', {name: 'from_time'})
    from?: string;
    @Column('time', {name: 'to_time'})
    to: string;
    @Column({name: 'exclude', default: false})
    exclude: boolean;
    @ManyToOne(() => ShiftWork)
    @JoinColumn({name: 'shift_work', referencedColumnName: "id"})
    shift: ShiftWork;
}