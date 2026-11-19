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
    return true;
  }
}
