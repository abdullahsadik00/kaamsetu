import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppError } from '../common/app-error.js';
import { FEATURE_KEY, featuresFor, type Feature } from '../organization/features.js';
import { loadPlan, OPEN_WHEN_READ_ONLY } from '../organization/plans.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ROLES_KEY, type Role } from './roles.js';
import { TokenService } from './token.service.js';
import type { AuthContext } from './token.service.js';

const IS_PUBLIC = 'kaamsetu:public';

/** Marks a route (or controller) as reachable without logging in. Everything else needs a token. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

type AuthedRequest = Request & { auth?: AuthContext };

/** The logged-in caller, set by AuthGuard. */
export const CurrentAuth = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthContext => {
    const auth = ctx.switchToHttp().getRequest<AuthedRequest>().auth;
    if (!auth) throw AppError.notFound();
    return auth;
  },
);

/** Global guard: deny by default (docs/10 §3 step 1). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.header('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Please log in again.');
    }
    const auth = await this.tokens.authenticate(token);
    req.auth = auth;

    // Steps 2–3 of docs/10 §3: business membership and role.
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (roles) {
      if (!auth.organizationId || !auth.role) {
        throw new AppError(
          403,
          'NO_ORGANIZATION',
          'Set up or join a business first.',
        );
      }
      if (!roles.includes(auth.role)) {
        throw new AppError(403, 'FORBIDDEN_ROLE', 'Your role cannot do this.');
      }
    }

    // Step 4 (D-044): the business type includes this part of the app.
    const feature = this.reflector.getAllAndOverride<Feature | undefined>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (feature && auth.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: auth.organizationId },
        select: { businessType: true },
      });
      if (!org || !featuresFor(org.businessType).includes(feature)) {
        throw new AppError(
          403,
          'NOT_IN_BUSINESS_TYPE',
          'Your business type does not include this. Change it in Business details.',
        );
      }
    }

    // Step 5 (D-045): once the plan has ended (after the grace days) the
    // business is view-only: reading and export work, new work does not.
    if (roles && auth.organizationId && req.method !== 'GET') {
      const open = this.reflector.getAllAndOverride<boolean>(OPEN_WHEN_READ_ONLY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (!open && (await loadPlan(this.prisma, auth.organizationId)).access === 'READ_ONLY') {
        throw new AppError(
          402,
          'PLAN_ENDED',
          'Your plan has ended. Choose a plan to keep adding work; everything you saved is still here.',
        );
      }
    }
    return true;
  }
}
