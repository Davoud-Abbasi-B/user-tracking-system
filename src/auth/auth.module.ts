import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard
    }
  ]
})
export class AuthModule {}
