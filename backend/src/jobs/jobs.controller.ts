import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Module,
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
  AssignSchema,
  CancelSchema,
  CreateJobSchema,
  JobsService,
  ListJobsSchema,
  UpdateJobSchema,
} from './jobs.service.js';
import type { CreateJob, ListJobs, UpdateJob } from './jobs.service.js';

const Id = new ZodValidationPipe(z.uuid());

/** Jobs, owner side (docs/06 §6, T4.6, D-030). Technician actions come with T4.7. */
@Roles('OWNER')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(ListJobsSchema)) q: ListJobs,
  ) {
    return this.jobs.list(auth, q);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(CreateJobSchema)) body: CreateJob,
  ) {
    return this.jobs.create(auth, body);
  }

  @Get(':id')
  get(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string) {
    return this.jobs.get(auth, id);
  }

  @Patch(':id')
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body(new ZodValidationPipe(UpdateJobSchema)) body: UpdateJob,
  ) {
    return this.jobs.update(auth, id, body);
  }

  @Post(':id/assign-team')
  @HttpCode(HttpStatus.OK)
  assign(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body(new ZodValidationPipe(AssignSchema)) body: { teamId: string },
  ) {
    return this.jobs.assign(auth, id, body.teamId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body(new ZodValidationPipe(CancelSchema)) body: { reason: string },
  ) {
    return this.jobs.cancel(auth, id, body.reason);
  }

  @Post(':id/follow-up')
  @HttpCode(HttpStatus.CREATED)
  followUp(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string) {
    return this.jobs.followUp(auth, id);
  }
}

@Module({ controllers: [JobsController], providers: [JobsService], exports: [JobsService] })
export class JobsModule {}
