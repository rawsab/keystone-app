import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './modules/health/health.module';

/**
 * Root application module
 */
@Module({
  imports: [ConfigModule, HealthModule],
})
export class AppModule {}
