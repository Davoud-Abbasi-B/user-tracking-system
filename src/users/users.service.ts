import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthContext } from '../auth/auth-context';
import { DatabaseService } from '../database/database.service';
import { MetricsService } from '../metrics/metrics.service';
import { LoginUserRequestDto } from './dto/login-user.dto';
import { LoginUserResponseDto } from './dto/login-user-response.dto';

type UserUpsertRow = {
  user_id: string;
  last_login_at: Date;
  login_count: number;
  inserted: boolean;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly metricsService: MetricsService
  ) {}

  async reportLogin(payload: LoginUserRequestDto, authContext: AuthContext): Promise<LoginUserResponseDto> {
    const startedAt = performance.now();
    this.validatePayload(payload, authContext);

    const loginTime = new Date(payload.login_time).toISOString();
    const attribution = payload.attribution ?? {};
    const metadata = payload.metadata ?? {};

    const result = await this.databaseService.query<UserUpsertRow>(
      `
        INSERT INTO users (
          user_id,
          first_seen_at,
          last_login_at,
          login_count,
          first_campaign_name,
          first_source,
          first_medium,
          last_campaign_name,
          last_source,
          last_medium,
          last_referer,
          last_landing_page,
          last_platform,
          last_product_name,
          last_store,
          schema_version,
          trace_id,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $2, 1,
          $3, $4, $5,
          $3, $4, $5, $6, $7,
          $8, $9, $10,
          $11, $12,
          now(), now()
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
          last_login_at = EXCLUDED.last_login_at,
          login_count = users.login_count + 1,
          last_campaign_name = EXCLUDED.last_campaign_name,
          last_source = EXCLUDED.last_source,
          last_medium = EXCLUDED.last_medium,
          last_referer = EXCLUDED.last_referer,
          last_landing_page = EXCLUDED.last_landing_page,
          last_platform = EXCLUDED.last_platform,
          last_product_name = EXCLUDED.last_product_name,
          last_store = EXCLUDED.last_store,
          schema_version = EXCLUDED.schema_version,
          trace_id = EXCLUDED.trace_id,
          updated_at = now()
        RETURNING
          user_id,
          last_login_at,
          login_count,
          (xmax = 0) AS inserted
      `,
      [
        this.cleanString(payload.user_id),
        loginTime,
        this.cleanString(attribution.campaign_name),
        this.cleanString(attribution.source),
        this.cleanString(attribution.medium),
        this.cleanString(attribution.referer),
        this.cleanString(attribution.landing_page),
        payload.platform,
        this.cleanString(payload.product_name),
        this.cleanString(attribution.store),
        this.cleanString(metadata.schema_version) ?? '1.0',
        this.cleanString(metadata.trace_id)
      ]
    );

    const row = result.rows[0];

    const response: LoginUserResponseDto = {
      success: true,
      user_id: row.user_id,
      action: row.inserted ? 'created' : 'updated',
      last_login_at: row.last_login_at.toISOString(),
      login_count: row.login_count
    };

    this.metricsService.increment('tracking_user_login_total', { action: response.action, platform: payload.platform });
    this.metricsService.observe('tracking_user_login_latency_ms', performance.now() - startedAt, { action: response.action });

    return response;
  }

  private validatePayload(payload: LoginUserRequestDto, authContext: AuthContext) {
    if (!payload || typeof payload !== 'object') {
      throw this.invalidPayload('payload must be a valid JSON object');
    }

    if (!this.cleanString(payload.user_id)) {
      throw this.invalidPayload('user_id is required');
    }

    if (!this.cleanString(payload.product_name)) {
      throw this.invalidPayload('product_name is required');
    }

    if (!['web', 'android', 'ios', 'backend'].includes(payload.platform)) {
      throw this.invalidPayload('platform must be one of web, android, ios, backend');
    }

    if (authContext.role !== 'backend' && payload.platform === 'backend') {
      throw this.invalidPayload('client API key cannot submit backend platform login reports');
    }

    if (!this.cleanString(payload.login_time) || Number.isNaN(Date.parse(payload.login_time))) {
      throw this.invalidPayload('login_time is required and must be a valid datetime');
    }

    if (payload.attribution !== undefined && (typeof payload.attribution !== 'object' || Array.isArray(payload.attribution))) {
      throw this.invalidPayload('attribution must be an object when present');
    }
  }

  private invalidPayload(message: string): BadRequestException {
    return new BadRequestException({
      success: false,
      error_code: 'INVALID_USER_LOGIN_PAYLOAD',
      message
    });
  }

  private cleanString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }
}
