import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import cors from '@fastify/cors';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { EnvService } from './config/env.service';

/**
 * Bootstrap the NestJS application with Fastify adapter
 */
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // ✅ Fastify CORS (single source of truth)
  await app.register(cors, {
    origin: (origin, cb) => {
      // allow non-browser clients (curl/postman) with no Origin
      if (!origin) return cb(null, true);

      const allowed = new Set(['http://localhost:3001']);
      cb(null, allowed.has(origin));
    },
    credentials: false, // Bearer auth, not cookies
    methods: 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,Accept',
    exposedHeaders: 'Content-Length,X-Keystone-Api-Version',
    optionsSuccessStatus: 204,
    preflightContinue: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const envService = app.get(EnvService);
  const port = envService.port;

  await app.listen(port, '0.0.0.0');
}

bootstrap();
