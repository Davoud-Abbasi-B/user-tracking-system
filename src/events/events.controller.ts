import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { RequestWithAuth } from '../auth/auth-context';
import { EventIngestRequestDto } from './dto/event-ingest.dto';
import { EventIngestResponseDto } from './dto/event-response.dto';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiBody({
    type: EventIngestRequestDto,
    examples: {
      validClientEvent: {
        summary: 'Valid client event',
        value: {
          event_name: 'start_WBI_fail',
          event_time: '2026-04-15T10:00:00Z',
          product_name: 'ghabzino',
          platform: 'web',
          user: {
            user_id: 'hashed_phone_value',
            anonymous_id: 'anon_123',
            session_id: 'sess_456'
          },
          attribution: {
            campaign_name: 'organic',
            source: 'google',
            medium: null,
            referer: 'google.com',
            attribution_source_type: 'referrer'
          },
          parameters: {
            Product: 'waterbillinquiry',
            message: 'service unavailable',
            error_code: 'GXXXX'
          },
          metadata: {
            producer: 'client',
            source_of_truth: 'client',
            schema_version: '1.0'
          }
        }
      },
      validBackendCallback: {
        summary: 'Valid backend payment callback',
        value: {
          event_name: 'payment_callback_basket_fail',
          event_time: '2026-04-15T10:05:00Z',
          product_name: 'ghabzino',
          platform: 'backend',
          user: {
            user_id: 'hashed_phone_value',
            anonymous_id: null,
            session_id: 'sess_789'
          },
          attribution: {
            campaign_name: 'organic',
            source: 'google',
            medium: null,
            referer: 'google.com',
            attribution_source_type: 'referrer'
          },
          parameters: {
            Product: 'basket',
            message: 'callback returned failed status',
            error_code: 'PAY_409',
            gateway_type: 'zarinpal'
          },
          metadata: {
            producer: 'backend',
            source_of_truth: 'backend',
            schema_version: '1.0',
            idempotency_key: 'paycb_123456'
          }
        }
      }
    }
  })
  @ApiCreatedResponse({ type: EventIngestResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid event payload.' })
  ingest(@Body() payload: EventIngestRequestDto, @Req() request: RequestWithAuth): Promise<EventIngestResponseDto> {
    return this.eventsService.ingest(payload, request.authContext!);
  }
}
