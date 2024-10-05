import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { TransferController } from './controller/transfer.controller';

@Module({
  controllers: [TransferController],
  imports: [AuthModule],
})
export class AutomationTransferModule {}
