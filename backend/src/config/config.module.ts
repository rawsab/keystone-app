import { Global, Module } from '@nestjs/common';
import { envSchema } from './env.schema';
import { EnvService } from './env.service';

/**
 * Validates environment variables and provides EnvService globally
 */
@Global()
@Module({
  providers: [
    {
      provide: EnvService,
      useFactory: () => {
        const result = envSchema.safeParse(process.env);

        if (!result.success) {
          const missing = result.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('\n  ');

          throw new Error(`Environment validation failed:\n  ${missing}`);
        }

        return new EnvService(result.data);
      },
    },
  ],
  exports: [EnvService],
})
export class ConfigModule {}
