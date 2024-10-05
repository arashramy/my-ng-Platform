import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import moment from 'moment-jalaali';
import { AppConstant } from '../../../common/constant/app.constant';
import { SaleOrderReport } from '../entities/SaleOrderReport';

@Processor('shop-report')
export class ShopReportService {
  @Process()
  async x(job: Job<any>) {
    let data = job.data;
    let time = moment(data.submitAt);
    if (time.minutes() >= 40) {
      time.endOf('hour');
    } else {
      time.startOf('hour');
    }
    let results = new Map();
    for (let item of data.items) {
      let x = results.get(item.id);
      if (!x) {
        x = new Map();
      }
      let submitTime = time.clone();
      let hour = submitTime.hour();
      let result = x.get(submitTime.day());
      if (!result) {
        result = new SaleOrderReport();
        result.date = submitTime.format(AppConstant.DATE_FORMAT);
        result.user = data.user;
        result.dayOfWeek = submitTime.weekday();
        result.monthGeorg = submitTime.month();
        result.yearGeorg = submitTime.year();
        result.type = item.type;
        result.saleOrder = data.id;
        result.category = item.category.id;
        result.fiscalYear = item.fiscalYear.id;
        result.saleUnit = data.saleUnit;
        result.orgUnit = data.organizationUnit;
        result.product = item.product.id;
        result.shiftWork = data.shiftWork;
        result.monthJalali = submitTime.jMonth();
        result.yearJalali = submitTime.jYear();
        result.season = Math.floor(result.monthJalali / 3);
        result[`h${submitTime.hour()}`] = item.quantity;
        result.quantity = 0;
      }
      result.quantity += item.quantity;
      if (!result[`h${hour}`]) result[`h${hour}`] = 0;
      x.set(submitTime.day(), result);
      results.set(item.id, x);
    }
    console.log(results);

    let models = [...results.values()]
      .map((x) => [...x.values()])
      .reduce((array, item) => array.concat(item), []);
    if (models.length > 0) {
      try {
        await SaleOrderReport.save(models);
      } catch (error) {
        console.log('error', error);
      }
    }
  }
}
