import { Module } from '@nestjs/common';
import { AccessCodesController } from './access-codes.controller';
import { AccessCodesService } from './access-codes.service';

@Module({
  controllers: [AccessCodesController],
  providers: [AccessCodesService],
  exports: [AccessCodesService],
})
export class AccessCodesModule {}
