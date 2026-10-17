import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Santé')
@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { status: 'UP', service: 'taches-service' };
  }
}
