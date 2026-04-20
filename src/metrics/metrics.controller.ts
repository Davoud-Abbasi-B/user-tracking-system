import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOkResponse({ description: 'Prometheus-style operational metrics.' })
  metrics(): string {
    return this.metricsService.render();
  }
}
