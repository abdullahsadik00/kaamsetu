import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/auth.guard.js';
import { RawResponse } from '../common/response-envelope.interceptor.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Unversioned and un-enveloped on purpose: uptime checks read it directly (docs/13 §4). */
@Public()
@RawResponse()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: string; database: string; time: string }> {
    let database = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    return { status: 'ok', database, time: new Date().toISOString() };
  }
}
