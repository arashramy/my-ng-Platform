import { Module } from '@nestjs/common';
import { PositionController } from './controller/position.controller';
import { CommonsModule } from '../../common/commons.module';
import { AuthModule } from '../../auth/auth.module';
import { TaskController } from './controller/task.controller';

@Module({
  controllers: [PositionController, TaskController],
  imports: [AuthModule, CommonsModule]
})
export class ProjectManagementBaseModule {}
