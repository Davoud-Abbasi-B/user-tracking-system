import { Injectable } from '@nestjs/common';
import { AuthContext } from '../auth/auth-context';
import { EventIngestRequestDto } from './dto/event-ingest.dto';
import { RegistryCacheService } from './registry-cache.service';

export type ValidationIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
};

export type RegistryEvent = {
  event_name: string;
  producer: 'client' | 'backend' | 'system';
  source_of_truth: 'client' | 'backend' | 'system';
  is_active: boolean;
};

@Injectable()
export class EventsValidator {
  constructor(private readonly registryCacheService: RegistryCacheService) {}

  async validate(
    payload: EventIngestRequestDto,
    authContext: AuthContext
  ): Promise<{ issues: ValidationIssue[]; registryEvent?: RegistryEvent }> {
    const issues: ValidationIssue[] = [];

    if (!payload || typeof payload !== 'object') {
      return {
        issues: [
          {
            code: 'VR-007',
            severity: 'error',
            message: 'payload must be a valid JSON object'
          }
        ]
      };
    }

    this.validateEnvelope(payload, issues);
    this.validateIdentity(payload, issues);
    this.validateParameters(payload, issues);
    this.validateMetadata(payload, issues);
    this.validateTrustBoundary(payload, authContext, issues);
    this.validateCallback(payload, authContext, issues);

    const registryEvent = await this.findRegistryEvent(payload);
    this.validateRegistry(payload, registryEvent, issues);

    return { issues, registryEvent };
  }

  private validateEnvelope(payload: EventIngestRequestDto, issues: ValidationIssue[]) {
    if (!this.isNonEmptyString(payload.event_name)) {
      issues.push({ code: 'VR-001', severity: 'error', message: 'event_name is required' });
    }

    if (!this.isValidDate(payload.event_time)) {
      issues.push({ code: 'VR-002', severity: 'error', message: 'event_time is required and must be a valid datetime' });
    }

    if (!this.isNonEmptyString(payload.product_name)) {
      issues.push({ code: 'VR-003', severity: 'error', message: 'product_name is required' });
    }

    if (!['web', 'android', 'ios', 'backend'].includes(payload.platform)) {
      issues.push({ code: 'VR-005', severity: 'error', message: 'platform must be one of web, android, ios, backend' });
    }
  }

  private validateIdentity(payload: EventIngestRequestDto, issues: ValidationIssue[]) {
    if (!payload.user || typeof payload.user !== 'object') {
      issues.push({ code: 'VR-202', severity: 'error', message: 'user object is required' });
      return;
    }

    const hasUserId = this.isNonEmptyString(payload.user.user_id);
    const hasAnonymousId = this.isNonEmptyString(payload.user.anonymous_id);

    if (!hasUserId && !hasAnonymousId) {
      issues.push({ code: 'VR-201', severity: 'error', message: 'at least one of user_id or anonymous_id must exist' });
    }

    const producer = payload.metadata?.producer ?? this.defaultProducer(payload);
    if (producer === 'client' && !this.isNonEmptyString(payload.user.session_id)) {
      issues.push({ code: 'VR-203', severity: 'error', message: 'session_id is required for client events' });
    }

    if (producer === 'backend' && !this.isNonEmptyString(payload.user.session_id)) {
      issues.push({ code: 'VR-204', severity: 'warning', message: 'session_id is recommended for backend events' });
    }
  }

  private validateParameters(payload: EventIngestRequestDto, issues: ValidationIssue[]) {
    if (!payload.parameters || typeof payload.parameters !== 'object' || Array.isArray(payload.parameters)) {
      issues.push({ code: 'VR-401', severity: 'error', message: 'parameters must be a JSON object' });
    }

    if (payload.parameters && JSON.stringify(payload.parameters).length > 64_000) {
      issues.push({ code: 'VR-405', severity: 'error', message: 'parameters payload is too large' });
    }
  }

  private validateMetadata(payload: EventIngestRequestDto, issues: ValidationIssue[]) {
    const metadata = payload.metadata ?? {};
    const producer = metadata.producer ?? this.defaultProducer(payload);
    const sourceOfTruth = metadata.source_of_truth ?? producer;

    if (!['client', 'backend', 'system'].includes(producer)) {
      issues.push({ code: 'VR-503', severity: 'error', message: 'producer must be allowed' });
    }

    if (!['client', 'backend', 'system'].includes(sourceOfTruth)) {
      issues.push({ code: 'VR-504', severity: 'error', message: 'source_of_truth must be allowed' });
    }

    if (metadata.trace_id !== undefined && !this.isNonEmptyString(metadata.trace_id)) {
      issues.push({ code: 'VR-506', severity: 'warning', message: 'trace_id should be a non-empty string when present' });
    }

    if (metadata.idempotency_key !== undefined && !this.isNonEmptyString(metadata.idempotency_key)) {
      issues.push({ code: 'VR-507', severity: 'warning', message: 'idempotency_key should be a non-empty string when present' });
    }
  }

  private validateTrustBoundary(payload: EventIngestRequestDto, authContext: AuthContext, issues: ValidationIssue[]) {
    if (authContext.role === 'backend') {
      return;
    }

    if (payload.platform === 'backend') {
      issues.push({ code: 'SEC-001', severity: 'error', message: 'client API key cannot submit backend platform events' });
    }

    if (payload.metadata?.producer === 'backend' || payload.metadata?.source_of_truth === 'backend') {
      issues.push({ code: 'SEC-002', severity: 'error', message: 'client API key cannot submit backend metadata fields' });
    }
  }

  private validateCallback(payload: EventIngestRequestDto, authContext: AuthContext, issues: ValidationIssue[]) {
    if (!payload.event_name?.startsWith('payment_callback_')) {
      return;
    }

    if (authContext.role !== 'backend') {
      issues.push({ code: 'SEC-003', severity: 'error', message: 'payment callback events require backend API key' });
      return;
    }

    const metadata = payload.metadata ?? {};
    const producer = metadata.producer ?? this.defaultProducer(payload);
    const sourceOfTruth = metadata.source_of_truth ?? producer;

    if (producer !== 'backend') {
      issues.push({ code: 'VR-601', severity: 'error', message: 'callback producer must be backend' });
    }

    if (sourceOfTruth !== 'backend') {
      issues.push({ code: 'VR-602', severity: 'error', message: 'callback source_of_truth must be backend' });
    }

    if (!this.isNonEmptyString(metadata.idempotency_key)) {
      issues.push({ code: 'VR-603', severity: 'error', message: 'callback must provide idempotency_key' });
    }

    if (payload.event_name.endsWith('_fail')) {
      const hasReason = this.isNonEmptyString(payload.parameters?.message) || this.isNonEmptyString(payload.parameters?.error_code);
      if (!hasReason) {
        issues.push({ code: 'VR-604', severity: 'warning', message: 'callback fail event should have message or error_code' });
      }
    }

    if (payload.event_name.endsWith('_success')) {
      const hasPaymentHint =
        this.isNonEmptyString(payload.parameters?.transaction_id) ||
        this.isNonEmptyString(payload.parameters?.provider_reference) ||
        payload.parameters?.pay_amount !== undefined;
      if (!hasPaymentHint) {
        issues.push({ code: 'VR-605', severity: 'warning', message: 'callback success event should have a payment hint' });
      }
    }
  }

  private async findRegistryEvent(payload: EventIngestRequestDto): Promise<RegistryEvent | undefined> {
    if (!payload.event_name || !payload.product_name || !payload.platform) {
      return undefined;
    }

    return this.registryCacheService.find(payload.product_name, payload.event_name, payload.platform);
  }

  private validateRegistry(payload: EventIngestRequestDto, registryEvent: RegistryEvent | undefined, issues: ValidationIssue[]) {
    if (!registryEvent) {
      issues.push({ code: 'VR-101', severity: 'error', message: 'event name must exist in registry' });
      return;
    }

    if (!registryEvent.is_active) {
      issues.push({ code: 'VR-103', severity: 'error', message: 'inactive registry event must be rejected' });
    }

    const producer = payload.metadata?.producer ?? this.defaultProducer(payload);
    const sourceOfTruth = payload.metadata?.source_of_truth ?? producer;

    if (producer !== registryEvent.producer) {
      issues.push({ code: 'VR-701', severity: 'error', message: 'producer must match registry' });
    }

    if (sourceOfTruth !== registryEvent.source_of_truth) {
      issues.push({
        code: 'VR-702',
        severity: payload.event_name.startsWith('payment_callback_') ? 'error' : 'warning',
        message: 'source_of_truth should match registry'
      });
    }
  }

  private defaultProducer(payload: EventIngestRequestDto): 'client' | 'backend' {
    return payload.platform === 'backend' ? 'backend' : 'client';
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private isValidDate(value: unknown): boolean {
    return this.isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
  }
}
