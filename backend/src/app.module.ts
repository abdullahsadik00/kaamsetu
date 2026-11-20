import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './config/env.js';
import { CustomersModule } from './customers/customers.module.js';
import { HealthController } from './health/health.controller.js';
import { OrganizationModule } from './organization/organization.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SiteController } from './site/site.controller.js';
import { FieldModule } from './field/field.js';
import { JobsModule } from './jobs/jobs.controller.js';
import { TeamsModule } from './teams/teams.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Default per-IP limit; login endpoints set a stricter one (docs/10 §5).
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 120 }] }),
    PrismaModule,
    AuthModule,
    OrganizationModule,
    CustomersModule,
    TeamsModule,
    JobsModule,
    FieldModule,
  ],
  controllers: [HealthController, SiteController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
