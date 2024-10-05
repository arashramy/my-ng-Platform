import {ShiftWork} from '../entities/ShiftWork';
import moment from 'moment';
import {Injectable} from '@nestjs/common';

@Injectable()
export class ShiftWorkService {
  async findBy(submitAt: Date, orgUnit: number) {
    let current = submitAt ? moment(submitAt) : moment();
    let day = current.isoWeekday() ;
    return ShiftWork.createQueryBuilder('shift')
        .leftJoin('shift.schedules', 'schedules')
        .leftJoin('shift.organizationUnit', 'organizationUnit')
        .leftJoin('shift.additionalCalendars', 'calendars')
        .where(`organizationUnit.id = :orgUnit`, {orgUnit: orgUnit})
        .andWhere(`((schedules.days::jsonb @> '${day}' AND 
                            schedules.from <= :time AND schedules.to > :time) AND 
                            NOT (calendars.date = :date AND calendars.from <= :time AND 
                            calendars.to > :time AND calendars.exclude IS TRUE)) OR 
                            (calendars.date = :date AND calendars.from <= :time AND 
                            calendars.to > :time AND calendars.exclude IS FALSE)`,
            {
              time: current.format('HH:mm:ss'),
              date: current.utc(true).format('YYYY-MM-DD')
            })
        .groupBy('shift.id')
        .getOne();
  }
}
