import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Module,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentAuth } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.js';
import type { AuthContext } from '../auth/token.service.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  AddTeamMemberSchema,
  CreateTeamSchema,
  TeamsService,
  UpdateTeamSchema,
} from './teams.service.js';
import type { AddTeamMember, CreateTeam, UpdateTeam } from './teams.service.js';

const Id = new ZodValidationPipe(z.uuid());

/** Teams (docs/06 §4, T4.2, D-029). Owner only. */
@Roles('OWNER')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.teams.list(auth);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(CreateTeamSchema)) body: CreateTeam,
  ) {
    return this.teams.create(auth, body);
  }

  @Get(':id')
  get(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string) {
    return this.teams.get(auth, id);
  }

  @Patch(':id')
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body(new ZodValidationPipe(UpdateTeamSchema)) body: UpdateTeam,
  ) {
    return this.teams.update(auth, id, body);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  addMember(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body(new ZodValidationPipe(AddTeamMemberSchema)) body: AddTeamMember,
  ) {
    return this.teams.addMember(auth, id, body);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Param('memberId', Id) memberId: string,
  ) {
    return this.teams.removeMember(auth, id, memberId);
  }
}

@Module({ controllers: [TeamsController], providers: [TeamsService] })
export class TeamsModule {}
