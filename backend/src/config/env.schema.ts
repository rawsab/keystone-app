import { z } from 'zod';

/**
 * Environment variable schema for Stage 1
 * Validates all required configuration at startup
 */
export const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),
  S3_BUCKET: z.string().min(1, 'S3_BUCKET is required'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
});

/**
 * Validated environment variables type
 */
export type Env = z.infer<typeof envSchema>;
