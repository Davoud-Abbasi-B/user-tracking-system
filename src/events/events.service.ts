import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EventIngestRequestDto } from './dto/event-ingest.dto';
import { EventIngestResponseDto } from './dto/event-response.dto';
import { EventsValidator, ValidationIssue } from './events.validator';

type NormalizedEvent = {
  eventId: string;
  receivedAt: string;
  producer: 'client' | 'backend' | 'system';
  sourceOfTruth: 'client' | 'backend' | 'system';
  schemaVersion: string;
  identityKey: string | null;
  resolvedUserState: 'anonymous' | 'identified' | 'backend_identified';
};

@Injectable()
export class EventsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventsValidator: EventsValidator
  ) {}

  async ingest(payload: EventIngestRequestDto): Promise<EventIngestResponseDto> {
    const { issues } = await this.eventsValidator.validate(payload);
    const errors = issues.filter((issue) => issue.severity === 'error');
    const warnings = issues.filter((issue) => issue.severity === 'warning');

    if (errors.length > 0) {
      await this.storeInvalidEvent(payload, errors);
      throw new BadRequestException({
        success: false,
        error_code: errors[0].code,
        message: errors[0].message,
        details: errors.map((error) => `${error.code}: ${error.message}`)
      });
    }

    const normalized = this.normalize(payload);

    try {
      await this.storeAcceptedEvent(payload, normalized, warnings);
      await this.upsertSession(payload, normalized);
      await this.upsertIdentityLink(payload);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          success: false,
          error_code: 'DUPLICATE_EVENT',
          message: 'event already exists for this idempotency key'
        });
      }
      throw error;
    }

    return {
      success: true,
      event_id: normalized.eventId,
      validation_status: warnings.length > 0 ? 'warning' : 'valid',
      received_at: normalized.receivedAt,
      warnings: warnings.length > 0 ? warnings.map((warning) => `${warning.code}: ${warning.message}`) : undefined
    };
  }

  private normalize(payload: EventIngestRequestDto): NormalizedEvent {
    const producer = payload.metadata?.producer ?? (payload.platform === 'backend' ? 'backend' : 'client');
    const sourceOfTruth = payload.metadata?.source_of_truth ?? producer;
    const userId = this.cleanString(payload.user?.user_id);
    const anonymousId = this.cleanString(payload.user?.anonymous_id);

    return {
      eventId: this.generateEventId(),
      receivedAt: new Date().toISOString(),
      producer,
      sourceOfTruth,
      schemaVersion: payload.metadata?.schema_version ?? '1.0',
      identityKey: userId ?? anonymousId,
      resolvedUserState: userId
        ? producer === 'backend'
          ? 'backend_identified'
          : 'identified'
        : 'anonymous'
    };
  }

  private async storeAcceptedEvent(
    payload: EventIngestRequestDto,
    normalized: NormalizedEvent,
    warnings: ValidationIssue[]
  ) {
    await this.databaseService.query(
      `
        INSERT INTO tracking_events (
          event_id,
          event_name,
          event_time,
          received_at,
          product_name,
          platform,
          producer,
          source_of_truth,
          user_id,
          anonymous_id,
          session_id,
          identity_key,
          resolved_user_state,
          campaign_name,
          source,
          medium,
          referer,
          attribution_source_type,
          schema_version,
          trace_id,
          idempotency_key,
          validation_status,
          validation_errors,
          parameters_json,
          raw_payload
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, $24, $25
        )
      `,
      [
        normalized.eventId,
        payload.event_name,
        payload.event_time,
        normalized.receivedAt,
        payload.product_name,
        payload.platform,
        normalized.producer,
        normalized.sourceOfTruth,
        this.cleanString(payload.user?.user_id),
        this.cleanString(payload.user?.anonymous_id),
        this.cleanString(payload.user?.session_id),
        normalized.identityKey,
        normalized.resolvedUserState,
        this.cleanString(payload.attribution?.campaign_name),
        this.cleanString(payload.attribution?.source),
        this.cleanString(payload.attribution?.medium),
        this.cleanString(payload.attribution?.referer),
        this.cleanString(payload.attribution?.attribution_source_type),
        normalized.schemaVersion,
        this.cleanString(payload.metadata?.trace_id),
        this.cleanString(payload.metadata?.idempotency_key),
        warnings.length > 0 ? 'warning' : 'valid',
        warnings.length > 0 ? JSON.stringify(warnings) : null,
        JSON.stringify(payload.parameters ?? {}),
        JSON.stringify(payload)
      ]
    );
  }

  private async storeInvalidEvent(payload: EventIngestRequestDto, errors: ValidationIssue[]) {
    await this.databaseService.query(
      `
        INSERT INTO tracking_invalid_events (
          event_name,
          product_name,
          platform,
          error_code,
          error_message,
          validation_errors,
          raw_payload
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        payload?.event_name ?? null,
        payload?.product_name ?? null,
        payload?.platform ?? null,
        errors[0].code,
        errors[0].message,
        JSON.stringify(errors),
        JSON.stringify(payload ?? {})
      ]
    );
  }

  private async upsertSession(payload: EventIngestRequestDto, normalized: NormalizedEvent) {
    const sessionId = this.cleanString(payload.user?.session_id);
    if (!sessionId) {
      return;
    }

    await this.databaseService.query(
      `
        INSERT INTO tracking_sessions (
          session_id,
          product_name,
          platform,
          user_id,
          anonymous_id,
          started_at,
          last_seen_at,
          campaign_name,
          source,
          medium,
          referer,
          attribution_source_type,
          raw_attribution
        )
        VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (session_id)
        DO UPDATE SET
          user_id = COALESCE(EXCLUDED.user_id, tracking_sessions.user_id),
          anonymous_id = COALESCE(EXCLUDED.anonymous_id, tracking_sessions.anonymous_id),
          last_seen_at = EXCLUDED.last_seen_at,
          campaign_name = COALESCE(tracking_sessions.campaign_name, EXCLUDED.campaign_name),
          source = COALESCE(tracking_sessions.source, EXCLUDED.source),
          medium = COALESCE(tracking_sessions.medium, EXCLUDED.medium),
          referer = COALESCE(tracking_sessions.referer, EXCLUDED.referer),
          attribution_source_type = COALESCE(tracking_sessions.attribution_source_type, EXCLUDED.attribution_source_type),
          raw_attribution = COALESCE(tracking_sessions.raw_attribution, EXCLUDED.raw_attribution)
      `,
      [
        sessionId,
        payload.product_name,
        payload.platform,
        this.cleanString(payload.user?.user_id),
        this.cleanString(payload.user?.anonymous_id),
        normalized.receivedAt,
        this.cleanString(payload.attribution?.campaign_name),
        this.cleanString(payload.attribution?.source),
        this.cleanString(payload.attribution?.medium),
        this.cleanString(payload.attribution?.referer),
        this.cleanString(payload.attribution?.attribution_source_type),
        payload.attribution ? JSON.stringify(payload.attribution) : null
      ]
    );
  }

  private async upsertIdentityLink(payload: EventIngestRequestDto) {
    const userId = this.cleanString(payload.user?.user_id);
    const anonymousId = this.cleanString(payload.user?.anonymous_id);

    if (!userId || !anonymousId) {
      return;
    }

    await this.databaseService.query(
      `
        INSERT INTO identity_links (anonymous_id, user_id, product_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (anonymous_id, user_id, product_name)
        DO UPDATE SET
          last_linked_at = now(),
          is_active = true
      `,
      [anonymousId, userId, payload.product_name]
    );
  }

  private generateEventId(): string {
    return `evt_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
  }

  private cleanString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }
}
