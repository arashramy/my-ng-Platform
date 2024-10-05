import {
  EntitySubscriberInterface,
  EventSubscriber,
  SoftRemoveEvent,
  UpdateEvent
} from 'typeorm';
import { AuditType, EntityAuditLog } from '../entities/EntityAuditLog';
import { getAudit } from '../../common/decorators/audit.decorator';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BeforeApplicationShutdown, Injectable } from '@nestjs/common';
import { OnEvent } from "@nestjs/event-emitter";
import { EventsConstant } from "../../common/constant/events.constant";
import { Transaction } from "../../automation/operational/entities/Transaction";

@Injectable()
@EventSubscriber()
export class EntityAuditService implements BeforeApplicationShutdown {
  tempQueue: EntityAuditLog[] = [];

  constructor() {}

  @OnEvent(EventsConstant.AUDIT)
  async onMessage(payload: EntityAuditLog) {
    if (payload) {
      this.tempQueue.push(payload);
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async insertBatch() {
    if (this.tempQueue?.length) {
      const temp = [...this.tempQueue];
      this.tempQueue = [];
      EntityAuditLog.insert(temp)
        .then((res) => {
          if (res.identifiers?.length) {
            console.info(
              'Audit log batch inserted: ' + res.identifiers?.length
            );
          }
        })
        .catch((err) => {
          console.error('Audit batch insert error:' + err.message);
          this.tempQueue = [...this.tempQueue, ...temp];
        });
    }
  }

  async beforeApplicationShutdown(signal?: string): Promise<any> {
    return this.insertBatch();
  }
}
