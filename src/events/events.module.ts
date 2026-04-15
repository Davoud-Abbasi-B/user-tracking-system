import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsValidator } from './events.validator';

@Module({
  controllers: [EventsController],
  providers: [EventsService, EventsValidator]
})
export class EventsModule {}
