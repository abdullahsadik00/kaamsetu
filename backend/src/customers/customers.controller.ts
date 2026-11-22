import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentAuth } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.js';
import type { AuthContext } from '../auth/token.service.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  CreateCustomerSchema,
  CreateEquipmentSchema,
  ListCustomersSchema,
  SiteSchema,
  UpdateCustomerSchema,
  UpdateEquipmentSchema,
} from './customers.schemas.js';
import type {
  CreateCustomer,
  CreateEquipment,
  ListCustomers,
  SiteInput,
  UpdateCustomer,
  UpdateEquipment,
} from './customers.schemas.js';
import { CustomersService } from './customers.service.js';

const Id = new ZodValidationPipe(z.uuid());

/**
 * Customers, addresses and ACs (docs/06 §5, T4.3/T4.4, D-028). Owner only:
 * technicians see a job's customer through the job, never a customer list
 * (docs/10 §3).
 */
@Roles('OWNER')
@Controller()
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get('customers')
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(ListCustomersSchema)) query: ListCustomers,
  ) {
    return this.customers.list(auth, query);
  }

  @Post('customers')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(CreateCustomerSchema)) body: CreateCustomer,
  ) {
    return this.customers.create(auth, body);
  }

  @Get('customers/:id')
  get(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string) {
    return this.customers.get(auth, id);
  }

  @Patch('customers/:id')
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body(new ZodValidationPipe(UpdateCustomerSchema)) body: UpdateCustomer,
  ) {
    return this.customers.update(auth, id, body);
  }

  @Get('customers/:id/history')
  history(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string) {
    return this.customers.history(auth, id);
  }

  @Get('equipment/:id/history')
  equipmentHistory(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string) {
    return this.customers.equipmentHistory(auth, id);
  }

  @Post('customers/:id/sites')
  @HttpCode(HttpStatus.CREATED)
  addSite(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body(new ZodValidationPipe(SiteSchema)) body: SiteInput,
  ) {
    return this.customers.addSite(auth, id, body);
  }

  @Post('equipment')
  @HttpCode(HttpStatus.CREATED)
  addEquipment(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(CreateEquipmentSchema)) body: CreateEquipment,
  ) {
    return this.customers.addEquipment(auth, body);
  }

  @Patch('equipment/:id')
  updateEquipment(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body(new ZodValidationPipe(UpdateEquipmentSchema)) body: UpdateEquipment,
  ) {
    return this.customers.updateEquipment(auth, id, body);
  }
}
