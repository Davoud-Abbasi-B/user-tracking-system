import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { MetricsService } from '../metrics/metrics.service';
import type { RegistryEvent } from './events.validator';

type RegistryRow = RegistryEvent & {
  product_name: string;
  platform: string;
};

@Injectable()
export class RegistryCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RegistryCacheService.name);
  private readonly registry = new Map<string, RegistryEvent>();
  private refreshTimer?: NodeJS.Timeout;
  private loading?: Promise<void>;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly metricsService: MetricsService
  ) {}

  async onModuleInit() {
    await this.refresh();
    const refreshMs = Number(this.configService.get<string>('TRACKING_REGISTRY_REFRESH_MS') ?? 60_000);
    this.refreshTimer = setInterval(() => {
      this.refresh().catch((error) => {
        this.metricsService.increment('tracking_registry_refresh_errors_total');
        this.logger.error(`Failed to refresh tracking registry: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, refreshMs);
    this.refreshTimer.unref();
  }

  onModuleDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  async find(productName: string, eventName: string, platform: string): Promise<RegistryEvent | undefined> {
    if (this.registry.size === 0) {
      await this.refresh();
    }

    const event = this.registry.get(this.key(productName, eventName, platform));
    this.metricsService.increment('tracking_registry_lookup_total', { result: event ? 'hit' : 'miss' });
    return event;
  }

  async refresh(): Promise<void> {
    if (this.loading) {
      return this.loading;
    }

    this.loading = this.loadRegistry().finally(() => {
      this.loading = undefined;
    });

    return this.loading;
  }

  private async loadRegistry() {
    const result = await this.databaseService.query<RegistryRow>(
      `
        SELECT product_name, event_name, platform, producer, source_of_truth, is_active
        FROM tracking_event_registry
      `
    );

    const nextRegistry = new Map<string, RegistryEvent>();
    for (const row of result.rows) {
      nextRegistry.set(this.key(row.product_name, row.event_name, row.platform), {
        event_name: row.event_name,
        producer: row.producer,
        source_of_truth: row.source_of_truth,
        is_active: row.is_active
      });
    }

    this.registry.clear();
    for (const [key, value] of nextRegistry.entries()) {
      this.registry.set(key, value);
    }

    this.metricsService.increment('tracking_registry_refresh_total');
    this.metricsService.observe('tracking_registry_size', this.registry.size);
  }

  private key(productName: string, eventName: string, platform: string): string {
    return `${productName}:${eventName}:${platform}`;
  }
}
