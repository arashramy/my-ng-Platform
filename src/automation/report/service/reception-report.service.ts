import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ReceptionQueueDto } from '../../operational/dto/ReceptionQueueDto';
import moment from 'moment-jalaali';
import { AppConstant } from '../../../common/constant/app.constant';
import {SaleOrderReport} from "../entities/SaleOrderReport";

@Processor('logout-reception')
export class ReceptionReportService {
  @Process()
  async transcode(job: Job<ReceptionQueueDto>) {
    let data = job.data;
    let start = moment(data.start);
    if (start.minutes() >= 40) {
      start.endOf('hour');
    } else {
      start.startOf('hour');
    }
    let end = moment(data.end);
    if (end.minutes() <= 20) {
      end.startOf('hour');
    } else {
      end.endOf('hour');
    }
    let results = new Map<number, Map<number, SaleOrderReport>>();
    for (let service of data.services) {
      let reports = results.get(service.service);
      if (!reports) {
        reports = new Map<number, SaleOrderReport>();
      }
      let startHour = start.clone();
      while (end.isSameOrAfter(startHour, 'hour')) {
        let hour = startHour.hour();
        let report = reports.get(startHour.day());
        if (!report) {
          report = new SaleOrderReport();
          report.date = startHour.format(AppConstant.DATE_FORMAT);
          report.user = data.user;
          report.dayOfWeek = startHour.weekday();
          report.monthGeorg = startHour.month();
          report.yearGeorg = startHour.year();
          report.monthJalali = startHour.jMonth();
          report.yearJalali = startHour.jYear();
          report.season = Math.floor(report.monthJalali / 3);
          // report.service = service.service;
          report[`h${hour}`] = 0;
          report.quantity = 0;
        }
        report.quantity += service.qty;
        if (!report[`h${hour}`]) report[`h${hour}`] = 0;
        report[`h${hour}`] += service.qty;
        reports.set(startHour.day(), report);
        startHour.add(1, 'hour');
      }
      results.set(service.service, reports);
    }
    let models: SaleOrderReport[] = [...results.values()]
      .map((x) => [...x.values()])
      .reduce((array, item) => array.concat(item), []);
    if (models.length > 0) {
      await SaleOrderReport.save(models);
    }
  }
}
