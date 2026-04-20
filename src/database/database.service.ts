import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      host: this.configService.get<string>('DATABASE_HOST') ?? 'localhost',
      port: Number(this.configService.get<string>('DATABASE_PORT') ?? 5432),
      user: this.configService.get<string>('DATABASE_USER') ?? 'tracking',
      password: this.configService.get<string>('DATABASE_PASSWORD') ?? 'tracking',
      database: this.configService.get<string>('DATABASE_NAME') ?? 'tracking',
      max: Number(this.configService.get<string>('DATABASE_POOL_MAX') ?? 20),
      idleTimeoutMillis: Number(this.configService.get<string>('DATABASE_IDLE_TIMEOUT_MS') ?? 30_000),
      connectionTimeoutMillis: Number(this.configService.get<string>('DATABASE_CONNECTION_TIMEOUT_MS') ?? 2_000)
    });
  }

  query<T extends QueryResultRow = QueryResultRow>(sql: string, values?: unknown[]): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, values);
  }

  async ping(): Promise<void> {
    await this.query('SELECT 1');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
