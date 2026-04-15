import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class UserContextDto {
  @ApiPropertyOptional({ example: 'hashed_phone_value' })
  @IsOptional()
  @IsString()
  user_id?: string | null;

  @ApiPropertyOptional({ example: 'anon_123' })
  @IsOptional()
  @IsString()
  anonymous_id?: string | null;

  @ApiPropertyOptional({ example: 'sess_456' })
  @IsOptional()
  @IsString()
  session_id?: string | null;
}

export class AttributionContextDto {
  @ApiPropertyOptional({ example: 'spring_campaign' })
  @IsOptional()
  campaign_name?: string | null;

  @ApiPropertyOptional({ example: 'google' })
  @IsOptional()
  source?: string | null;

  @ApiPropertyOptional({ example: 'cpc' })
  @IsOptional()
  medium?: string | null;

  @ApiPropertyOptional({ example: 'google.com' })
  @IsOptional()
  referer?: string | null;

  @ApiPropertyOptional({ example: 'utm' })
  @IsOptional()
  attribution_source_type?: string | null;
}

export class EventMetadataDto {
  @ApiPropertyOptional({ enum: ['client', 'backend', 'system'], example: 'client' })
  @IsOptional()
  @IsIn(['client', 'backend', 'system'])
  producer?: 'client' | 'backend' | 'system';

  @ApiPropertyOptional({ enum: ['client', 'backend', 'system'], example: 'client' })
  @IsOptional()
  @IsIn(['client', 'backend', 'system'])
  source_of_truth?: 'client' | 'backend' | 'system';

  @ApiPropertyOptional({ example: '1.0' })
  @IsOptional()
  @IsString()
  schema_version?: string;

  @ApiPropertyOptional({ example: 'trace_01HXYZ' })
  @IsOptional()
  @IsString()
  trace_id?: string;

  @ApiPropertyOptional({ example: 'paycb_123456' })
  @IsOptional()
  @IsString()
  idempotency_key?: string;
}

export class EventIngestRequestDto {
  @ApiProperty({ example: 'start_WBI_fail' })
  @IsString()
  @IsNotEmpty()
  event_name!: string;

  @ApiProperty({ example: '2026-04-12T10:15:30Z' })
  @IsString()
  @IsNotEmpty()
  event_time!: string;

  @ApiProperty({ example: 'ghabzino' })
  @IsString()
  @IsNotEmpty()
  product_name!: string;

  @ApiProperty({ enum: ['web', 'android', 'ios', 'backend'], example: 'web' })
  @IsString()
  @IsIn(['web', 'android', 'ios', 'backend'])
  platform!: 'web' | 'android' | 'ios' | 'backend';

  @ApiProperty({ type: UserContextDto })
  @IsObject()
  user!: UserContextDto;

  @ApiPropertyOptional({ type: AttributionContextDto })
  @IsOptional()
  @IsObject()
  attribution?: AttributionContextDto;

  @ApiProperty({ example: { Product: 'waterbillinquiry', message: 'service unavailable', error_code: 'GXXXX' } })
  @IsObject()
  parameters!: Record<string, unknown>;

  @ApiPropertyOptional({ type: EventMetadataDto })
  @IsOptional()
  @IsObject()
  metadata?: EventMetadataDto;
}
