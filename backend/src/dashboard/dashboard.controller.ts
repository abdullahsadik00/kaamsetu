import { Controller, Get, Module } from '@nestjs/common';
import { CurrentAuth } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.js';
import type { AuthContext } from '../auth/token.service.js';
import { BillingModule } from '../billing/billing.controller.js';
import { DashboardService } from './dashboard.service.js';

/** Owner home cards in one call (Stitch 02, T4.12, D-036). Owner only. */
@Roles('OWNER')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  get(@CurrentAuth() auth: AuthContext) {
    return this.dashboard.get(auth);
  }
}

@Module({ imports: [BillingModule], controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
