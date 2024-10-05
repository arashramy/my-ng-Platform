import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SaleOrder } from '../entities/SaleOrder';
import { ActionAfterUnfairUsageTime } from '../../../automation/base/entities/Product';
import moment from 'moment';
import { AppConstant } from '../../../common/constant/app.constant';
import { CronJob, CronTime } from 'cron';
import { User } from '../../../base/entities/User';
import { ReceptionService } from './reception.service';
import { SaleItem } from '../entities/SaleItem';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../../../common/constant/events.constant';
import {
  createOperationDeviceEvent,
  DeviceOperationType,
  OperationNameDevice
} from '../../../remote/device/device.util';
import { DeviceMessage } from '../../../remote/device/device.constant';

@Injectable()
export class AutoMationLogoutService {
  constructor(
    private readonly scheduleRegistery: SchedulerRegistry,
    private receptionService: ReceptionService,
    private eventEmitter: EventEmitter2
  ) {}
  async automaticlyRegisterUnFairCronJob(
    order: SaleOrder,
    oldItems: SaleItem[]
  ) {
    console.log('oldItemss length---------------', oldItems?.length);
    const isExitAutoDuringPenaltys = order.items.filter(
      (e) =>
        e.product.fairUseTime > 0 &&
        e.product.actionAfterUnfairUsageTime ===
          ActionAfterUnfairUsageTime.Exit &&
        e.deletedAt === null
    );
    console.log('isExitAutoDuringPenalty', isExitAutoDuringPenaltys.length);

    if (!isExitAutoDuringPenaltys || isExitAutoDuringPenaltys.length === 0) {
      if (oldItems && oldItems.length > 0) {
        return this.deleteSaleOrderJob(order.id, oldItems);
      } else {
        return;
      }
    }

    const findSaleItemWithPenalty = isExitAutoDuringPenaltys.sort((pre, curr) =>
      pre.quantity < curr.quantity ? 1 : -1
    )[0];
    console.log(
      'findSaleItemWithPenalty',
      findSaleItemWithPenalty?.deletedAt,
      findSaleItemWithPenalty?.title
    );

    const allowdTime =
      findSaleItemWithPenalty.product.fairUseTime *
      (findSaleItemWithPenalty.quantity / findSaleItemWithPenalty.persons);

    const cronJobDate = moment(findSaleItemWithPenalty.createdAt)
      .add(allowdTime, 'minutes')
      .format(AppConstant.SUBMIT_TIME_FORMAT);

    const cronJobTimeExcute = this.getCronJobDate(cronJobDate);
    console.log('cronJobTimeExcute', cronJobTimeExcute);
    let job: CronJob;
    try {
      job = this.scheduleRegistery.getCronJob(`${order.id}`);
      console.log('job------------------------------', job);
    } catch (error) {}
    if (job) {
      const cronTime = new CronTime(cronJobTimeExcute);
      job.setTime(cronTime);
    } else {
      // create
      try {
        const cron = new CronJob(cronJobTimeExcute, () => {
          this.exitCronJob(`${order.id}`);
        });
        cron.start();
        this.scheduleRegistery.addCronJob(`${order.id}`, cron);
      } catch (error) {}
    }
  }

  async exitCronJob(name: string) {
    const job = this.scheduleRegistery.getCronJob(name);
    if (!job) return;
    const current = await User.findOne({ where: { id: 1 } });
    const reception = await SaleOrder.findOne({
      where: { id: +name },
      relations: { user: true, saleUnit: true }
    });
    console.log(
      'conditiom--------------96',
      reception.totalAmount !== reception.settleAmount
    );
    if (reception.totalAmount !== reception.settleAmount) {

      this.eventEmitter.emit(
        EventsConstant.CLIENT_REMOTE,
        createOperationDeviceEvent(
          OperationNameDevice.UNFAIR_USAGE_PENALTY,
          {
            user: reception.user.id,
            id: reception.id,
            type: 'error',
            order: reception,
            saleUnit: reception.saleUnit,
            message: DeviceMessage.INVALID_LOGOUT_UNFAIR
          },
          DeviceOperationType.ERROR
        )
      );
    } else {
      try {
        this.receptionService.logout({ id: +name } as any, current);
      } catch (error) {
        console.log('errorr--------', error?.message);
      }
    }
    console.log('this is my job', job);
    try {
      this.scheduleRegistery.deleteCronJob(name);
    } catch (error) {}
  }

  async deleteAllJobs() {
    const jobs = this.scheduleRegistery.getCronJobs();
    jobs.forEach((job, name) => this.scheduleRegistery.deleteCronJob(name));
  }

  getCronJobDate(cronJobDate: string) {
    const time = cronJobDate.split(' ')[1];
    const date = cronJobDate.split(' ')[0];
    const day = date.split('-')[2];
    const hour = time.split(':')[0];
    const minutes = time.split(':')[1];
    return `0 ${+minutes < 0 ? `0${minutes}` : `${minutes}`} ${
      +hour === 0 ? '*' : hour
    } ${+day === 0 ? '*' : day} * *`;
  }

  deleteSaleOrderJob(orderId: number, items: SaleItem[]) {
    const isExitAutoDuringPenalty = items.find(
      (e) =>
        e.product.fairUseTime > 0 &&
        e.product.actionAfterUnfairUsageTime === ActionAfterUnfairUsageTime.Exit
    );
    console.log(
      'isExitAutoDuringPenalty delete func',
      isExitAutoDuringPenalty,
      items
    );
    if (!isExitAutoDuringPenalty) return;
    try {
      this.scheduleRegistery.deleteCronJob(`${orderId}`);
      console.log('delete-job-----------------------');
    } catch (error) {}
  }
}
