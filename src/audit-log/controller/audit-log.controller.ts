import { Controller, Get, Query } from '@nestjs/common';
import { ReadController } from '../../common/controller/base.controller';
import { PermissionKey } from '../../common/constant/auth.constant';
import { AuditType, EntityAuditLog } from '../entities/EntityAuditLog';
import { DataSource } from 'typeorm';
import { getAudit } from '../../common/decorators/audit.decorator';
import { SaleItem } from '../../automation/operational/entities/SaleItem';
import moment from 'moment';
import { User } from '../../base/entities/User';

@Controller('/api/audit-logs')
export class EntityAuditLogController extends ReadController<EntityAuditLog> {
  constructor(private ds: DataSource) {
    super(EntityAuditLog, PermissionKey.BASE_LOGS_AUDIT);
  }

  @Get('/entities')
  getEntities() {
    return this.ds.entityMetadatas
      .filter((t) => {
        return typeof t.target != 'string' && !!getAudit(t.target);
      })
      .map((e) => e.name);
  }

  @Get('/report')
  async getReport(@Query() params: any) {
    const query = EntityAuditLog.createQueryBuilder('q');
    query
      .leftJoinAndSelect('q.createdBy', 'createdBy')
      .where('q.entity=:entityName', { entityName: params.entityName })
      .andWhere('q.type=:auditType', { auditType: AuditType.Update })
      .andWhere(`q.after_value->>'${params.field}' IS NOT NULL`);

    console.log('params.entityType', params.entityType);
    if (params.entityType) {
      query
        .leftJoinAndSelect(
          (qb) => {
            return qb
              .from(SaleItem, 's')
              .select([])
              .addSelect('s.id', 'id')
              .addSelect('s.type', 'type')
              .addSelect('s.user', 'user')
              .where('s.type = :entityType', {
                entityType: params.entityType
              });
          },
          'sale',
          'sale.id = CAST(q.entityId as integer)'
        )
        .andWhere('sale is Not Null');
    }

    if (params.entityName === 'SaleItem') {
      query
        .leftJoinAndSelect(User, 'user', 'sale.user=user.id')
        .leftJoinAndSelect(SaleItem, 'saleItem', 'sale.id=saleItem.id');
    }

    if (params.start && params.end) {
      query.andWhere('q.createdAt BETWEEN :startDate AND :endDate', {
        startDate: params.start,
        endDate: moment(params.end).add('day', 1)
      });
    } else if (params.start) {
      query.andWhere('q.createdAt >= :startDate', { startDate: params.start });
    } else if (params.end) {
      query.andWhere('q.createdAt <= :endDate', {
        endDate: moment(params.end).add('day', 1)
      });
    }

    return await query.orderBy('q.createdAt','DESC').getMany()
  }

  additionalPermissions(): any[] {
    return [];
  }
}

// return this.ds.entityMetadatas
//   .filter(t => t.tableType === 'regular')
//   .map(e => {
//     let c=e.ownColumns.filter(c=>
//       ['id', 'createdAt', 'updatedAt','createdBy', 'updatedBy','deletedAt','deletedBy'].indexOf(c.propertyName) == -1)
//       .reduce((a,b)=>Object.assign(a,{[b.propertyName]:""}),{})
//     return {
//       [e.name]: {
//         entityName: '',
//         menuLabel: '',
//         create: 'ایجاد',
//         edit: 'ویرایش',
//         ...c
//       },
//     };
//   })
//   .reduce((previousValue, currentValue) => {
//     Object.assign(previousValue, currentValue);
//     return previousValue;
//   }, {});
