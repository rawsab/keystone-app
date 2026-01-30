import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './infra/db/prisma.module';
import { RbacModule } from './security/rbac/rbac.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { FilesModule } from './modules/files/files.module';
import { DailyReportsModule } from './modules/daily-reports/daily-reports.module';
import { HealthModule } from './modules/health/health.module';
import { VersionModule } from './modules/version/version.module';
import { VersionHeadersInterceptor } from './common/interceptors/version-headers.interceptor';

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
    FilesModule,
    DailyReportsModule,
    HealthModule,
    VersionModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: VersionHeadersInterceptor,
    },
  ],
})
export class AppModule {}
