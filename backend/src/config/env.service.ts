import { Injectable } from '@nestjs/common';
import { Env } from './env.schema';

/**
 * Type-safe configuration service
 * Provides access to validated environment variables
 */
@Injectable()
export class EnvService {
  private readonly env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  get port(): number {
    return this.env.PORT;
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get jwtSecret(): string {
    return this.env.JWT_SECRET;
  }

  get awsRegion(): string {
    return this.env.AWS_REGION;
  }

  get s3Bucket(): string {
    return this.env.S3_BUCKET;
  }

  get awsAccessKeyId(): string | undefined {
    return this.env.AWS_ACCESS_KEY_ID;
  }

  get awsSecretAccessKey(): string | undefined {
    return this.env.AWS_SECRET_ACCESS_KEY;
  }

  get s3Endpoint(): string | undefined {
    const v = process.env.S3_ENDPOINT?.trim();
    return v && v.length > 0 ? v : undefined;
  }

  get s3ForcePathStyle(): boolean {
    const v = process.env.S3_FORCE_PATH_STYLE?.trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
  }
}
