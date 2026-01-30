import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FastifyReply } from 'fastify';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class VersionHeadersInterceptor implements NestInterceptor {
  private readonly apiVersion = 'v1';
  private readonly appVersion: string;

  constructor() {
    try {
      const packageJsonPath = join(__dirname, '../../../package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      this.appVersion = packageJson.version;
    } catch (error) {
      this.appVersion = '0.0.0';
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<FastifyReply>();

    try {
      response.header('X-Keystone-Api-Version', this.apiVersion);
      response.header('X-Keystone-App-Version', this.appVersion);
    } catch (error) {
      // Silently fail if headers cannot be set
    }

    return next.handle();
  }
}
