import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './infra/db/prisma.module';
import { HealthModule } from './modules/health/health.module';

/**
 * Root application module
 */
@Module({
  imports: [ConfigModule, PrismaModule, HealthModule],
})
export class AppModule {}
