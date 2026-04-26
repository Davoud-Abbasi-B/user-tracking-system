import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventIngestResponseStatusDto } from '../../common/dto/envelope.dto';

export class EventIngestResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiPropertyOptional({ example: 'evt_m3n4p5q6_a1b2c3d4' })
  event_id?: string;

  @ApiPropertyOptional({ enum: ['valid', 'warning'], example: 'valid' })
  validation_status?: 'valid' | 'warning';

  @ApiPropertyOptional({ example: '2026-04-12T12:00:00.000Z' })
  received_at?: string;

  @ApiPropertyOptional({ example: ['VR-604: callback fail event is missing error_code'] })
  warnings?: string[];
}

export class EventEnvelopeResponseDto {
  @ApiProperty({ type: () => EventIngestResponseStatusDto })
  Status!: EventIngestResponseStatusDto;

  @ApiProperty({ type: () => EventIngestResponseDto })
  Parameters!: EventIngestResponseDto;
}
