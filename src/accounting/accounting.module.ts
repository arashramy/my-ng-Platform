import { Module } from '@nestjs/common';
import { AccountCodingModule } from './base/coding/coding.module';
import { AccountFloatingModule } from './base/floating/floating.module';

@Module({
  imports: [AccountCodingModule, AccountFloatingModule],
})
export class AccountingModule {}
