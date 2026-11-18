import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('Santé')
@Controller('health')
export class HealthController {
  constructor(private readonly base: DataSource) {}

  /** UP seulement si PostgreSQL répond : le healthcheck Docker s'appuie dessus. */
  @Get()
  async health() {
    try {
      await this.base.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({ status: 'DOWN', service: 'taches-service', base: 'DOWN' });
    }
    return { status: 'UP', service: 'taches-service', base: 'UP' };
  }
}
