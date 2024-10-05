import {Column, Entity} from 'typeorm';
import {Relation} from '../../../common/decorators/mvc.decorator';
import {IsNotEmpty,} from 'class-validator';
import {UniqueValidate} from '../../../common/validators/unique.validator';
import {CoreEntity} from "../../../base/entities/CoreEntity";

@Relation({
  findAll: [],
  get: [],
  autoComplete: [],
})
@Entity({name: '_local_calendar'})
export class LocalCalendar extends CoreEntity {
  @IsNotEmpty()
  @UniqueValidate(LocalCalendar)
  @Column('date', {name: 'date'})
  date?: Date;
  @Column({name: 'holiday', default: true})
  holiday?: boolean;
  @Column({name: 'description', nullable: true})
  description?: string;
}
