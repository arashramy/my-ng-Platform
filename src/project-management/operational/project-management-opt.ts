import { Module } from '@nestjs/common';
import { CommonsModule } from '../../common/commons.module';
import { AuthModule } from '../../auth/auth.module';
import { ProjectController } from './controller/project.controller';
import { ActivityController } from './controller/activity.controller';

@Module({
  controllers: [ProjectController, ActivityController],
  imports: [AuthModule, CommonsModule]
})
export class ProjectManagementOperationalModule {}
