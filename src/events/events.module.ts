import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsValidator } from './events.validator';
import { RegistryCacheService } from './registry-cache.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, EventsValidator, RegistryCacheService]
})
export class EventsModule {}
