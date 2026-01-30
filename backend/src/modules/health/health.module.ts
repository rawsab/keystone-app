import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Health check module
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
