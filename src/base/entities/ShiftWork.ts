import {Column, Entity, OneToMany} from 'typeorm';
import {IsNotEmpty} from 'class-validator';
import {ShiftWorkCalendar} from './ShiftWorkCalendar';
import {Relation} from "../../common/decorators/mvc.decorator";
import {ShiftWorkSchedule} from "./ShiftWorkSchedule";
import {OrganizationUnitBaseEntity} from "./OrganizationUnitBaseEntity";
import { Audit } from '../../common/decorators/audit.decorator';

@Audit()
@Relation({
  findAll: ["organizationUnit"],
  get: ["organizationUnit", "additionalCalendars", "schedules"]
})
@Entity({name: '_shift_work'})
export class ShiftWork extends OrganizationUnitBaseEntity {
  @IsNotEmpty()
  @Column({name: 'title', type: 'varchar', nullable: false})
  title: string;
  @OneToMany(() => ShiftWorkSchedule, (object) => object.shift, {
    cascade: true, persistence: true, orphanedRowAction: "soft-delete"
  })
  schedules: ShiftWorkSchedule[];
  @OneToMany(() => ShiftWorkCalendar, (object) => object.shift, {
    cascade: true, persistence: true, orphanedRowAction: "soft-delete"
  })
  additionalCalendars: ShiftWorkCalendar[];
}
