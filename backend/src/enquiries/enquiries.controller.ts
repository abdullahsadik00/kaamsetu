import { Body, Controller, Get, HttpCode, HttpStatus, Module, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentAuth } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.js';
import type { AuthContext } from '../auth/token.service.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { JobsModule } from '../jobs/jobs.controller.js';
import {
  CloseSchema,
  ConvertSchema,
  CreateEnquirySchema,
  EnquiriesService,
  ListEnquiriesSchema,
  UpdateEnquirySchema,
} from './enquiries.service.js';
import type { Convert, CreateEnquiry, ListEnquiries, UpdateEnquiry } from './enquiries.service.js';

const Id = new ZodValidationPipe(z.uuid());

/** Enquiries, owner only (docs/06 §5a, T4.5, D-033). */
@Roles('OWNER')
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(ListEnquiriesSchema)) q: ListEnquiries,
  ) {
    return this.enquiries.list(auth, q);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(CreateEnquirySchema)) body: CreateEnquiry,
  ) {
    return this.enquiries.create(auth, body);
  }

  @Get(':id')
  get(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string) {
    return this.enquiries.get(auth, id);
  }

  @Patch(':id')
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body(new ZodValidationPipe(UpdateEnquirySchema)) body: UpdateEnquiry,
  ) {
    return this.enquiries.update(auth, id, body);
  }

  /** Returns the new job. */
  @Post(':id/convert')
  @HttpCode(HttpStatus.CREATED)
  convert(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body(new ZodValidationPipe(ConvertSchema)) body: Convert,
  ) {
    return this.enquiries.convert(auth, id, body);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  close(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body(new ZodValidationPipe(CloseSchema)) body: { reason: string },
  ) {
    return this.enquiries.close(auth, id, body.reason);
  }
}

@Module({ imports: [JobsModule], controllers: [EnquiriesController], providers: [EnquiriesService], exports: [EnquiriesService] })
export class EnquiriesModule {}
