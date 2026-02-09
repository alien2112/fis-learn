import { Global, Module } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';
import { RetryService } from './retry.service';

@Global()
@Module({
  providers: [CircuitBreakerService, RetryService],
  exports: [CircuitBreakerService, RetryService],
})
export class ResilienceModule {}
