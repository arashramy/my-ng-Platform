import { Module } from '@nestjs/common';
import { EntityAuditLogController } from './controller/audit-log.controller';
import { CommonsModule } from '../common/commons.module';
import { AuthModule } from '../auth/auth.module';
import { EntityAuditService } from './providers/entity-audit-service';
import { EntityAuditListener } from './listeners/entity-audit-listener';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [CommonsModule, AuthModule, EventEmitterModule.forRoot()],
  controllers: [EntityAuditLogController],
  providers: [EntityAuditService, EntityAuditListener],
  exports: []
})
export class AuditModule {}
