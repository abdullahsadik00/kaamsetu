import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Prisma client ready');
    } catch {
      // Let the API start without a database so /health can report the problem.
      this.logger.warn('Could not connect to PostgreSQL. Check DATABASE_URL in .env');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
