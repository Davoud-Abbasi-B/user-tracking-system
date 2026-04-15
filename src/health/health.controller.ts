import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('health')
  @ApiOkResponse({ description: 'Service is alive.' })
  health() {
    return {
      status: 'ok',
      service: 'user-tracking-system',
      timestamp: new Date().toISOString()
    };
  }

  @Get('ready')
  @ApiOkResponse({ description: 'Service dependencies are ready.' })
  async ready() {
    try {
      await this.databaseService.ping();
      return {
        status: 'ready',
        database: 'ok',
        timestamp: new Date().toISOString()
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        database: 'unavailable',
        timestamp: new Date().toISOString()
      });
    }
  }
}
