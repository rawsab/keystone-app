import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './infra/db/prisma.module';
import { RbacModule } from './security/rbac/rbac.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { HealthModule } from './modules/health/health.module';

/**
 * Root application module
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RbacModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    HealthModule,
  ],
})
export class AppModule {}
