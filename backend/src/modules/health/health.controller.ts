import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

/**
 * Health check endpoint for deployment monitoring
 */
@Controller('api/v1/health')
export class HealthController {
  /**
   * Returns basic health status
   */
  @Get()
  check(): ApiResponse<{ ok: boolean }> {
    return {
      data: { ok: true },
      error: null,
    };
  }
}
