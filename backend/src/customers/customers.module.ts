import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService],
  // Owner operations saved offline (D-021) reuse the same rules.
  exports: [CustomersService],
})
export class CustomersModule {}
