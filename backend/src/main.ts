// Load backend/.env before anything reads process.env (real env vars still win).
import 'dotenv/config';
import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { useJsonLogs, validateEnv } from './config/env.js';

async function bootstrap() {
  // Validate early so the logger format is known before Nest starts logging.
  const env = validateEnv(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({
      json: useJsonLogs(env),
      colors: !useJsonLogs(env),
    }),
  });
  // Behind a hosting proxy, trust exactly that many hops of X-Forwarded-For so
  // rate limits see each caller's IP, not the proxy's (docs/13 §2).
  if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);
  configureApp(app);
  await app.listen(app.get(ConfigService).get<number>('PORT') ?? 3000);
}
await bootstrap();
