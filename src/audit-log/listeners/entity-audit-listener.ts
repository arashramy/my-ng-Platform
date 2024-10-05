import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  SoftRemoveEvent,
  UpdateEvent
} from 'typeorm';
import { AuditType } from '../entities/EntityAuditLog';
import { getAudit } from '../../common/decorators/audit.decorator';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventsConstant } from '../../common/constant/events.constant';

@Injectable()
@EventSubscriber()
export class EntityAuditListener implements EntitySubscriberInterface {
  constructor(
    private readonly datasource: DataSource,
    private eventEmitters: EventEmitter2
  ) {
    this.datasource.subscribers.push(this);
  }

  async afterUpdate(event: UpdateEvent<any>): Promise<any> {
    const audit = getAudit(event.metadata.target);
    if (audit && event.databaseEntity && event.entity) {
      const changed = this.getChangedValue(event);
      if (changed) {
        if (changed.afterValue.deletedAt) {
          const updatedBy = event.entity.deletedBy || event.entity.deletedBy;
          await this.eventEmitters.emitAsync(EventsConstant.AUDIT, {
            entity: event.metadata.name,
            entityId: event.entity.id,
            createdAt: new Date(),
            type: AuditType.Delete,
            createdBy: updatedBy,
            previousValue: event.entity
          });
        } else {
          const updatedBy = event.entity.updatedBy || event.entity.updatedBy;
          await this.eventEmitters.emitAsync(EventsConstant.AUDIT, {
            entity: event.metadata.name,
            entityId: event.entity.id,
            createdAt: new Date(),
            type: AuditType.Update,
            createdBy: updatedBy,
            ...changed
          });
        }
      }
    }
  }

  async afterSoftRemove(event: SoftRemoveEvent<any>): Promise<any> {
    const audit = getAudit(event.metadata.target);
    if (audit) {
      const updatedBy = event.entity.deletedBy || event.entity.deletedBy;
      await this.eventEmitters.emitAsync(EventsConstant.AUDIT, {
        entity: event.metadata.name,
        entityId: event.entityId,
        createdAt: new Date(),
        type: AuditType.Delete,
        createdBy: updatedBy,
        previousValue: event.entity
      });
    }
  }

  getChangedValue(event: UpdateEvent<any>) {
    const params = [];
    for (const param of event.updatedColumns) {
      if (['id', 'createdAt', 'updatedAt'].indexOf(param.propertyPath) < 0) {
        params.push(param.propertyName);
      }
    }
    for (const param of event.updatedRelations) {
      if (['createdBy', 'updatedBy'].indexOf(param.propertyPath) < 0) {
        params.push(param.propertyName);
      }
    }
    const previousValue: any = {},
      afterValue: any = {};
    for (const param of params) {
      previousValue[param] = event.databaseEntity[param];
      afterValue[param] = event.entity[param];
    }
    if (params?.length) {
      return {
        previousValue,
        afterValue
      };
    }
    return null;
  }
}
