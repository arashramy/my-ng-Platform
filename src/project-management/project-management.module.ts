import { Module } from '@nestjs/common';
import { ProjectManagementBaseModule } from './base/project-management-base.module';
import { ProjectManagementOperationalModule } from './operational/project-management-opt';
import { AuthModule } from '../auth/auth.module';
import { CommonsModule } from '../common/commons.module';

@Module({
  imports: [
    ProjectManagementBaseModule,
    ProjectManagementOperationalModule,
    AuthModule,
    CommonsModule
  ]
})
export class ProjectManagementModule {}
