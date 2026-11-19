import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { map, Observable } from 'rxjs';
import { requestIdOf } from './request-context.middleware.js';

const RAW_RESPONSE = 'kaamsetu:rawResponse';

/** Skip the `{ data, meta }` envelope (used by /health, which load balancers read). */
export const RawResponse = () => SetMetadata(RAW_RESPONSE, true);

/** Wraps successful responses as `{ data, meta: { requestId } }` (docs/06 §1). */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const raw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (raw) return next.handle();

    const requestId = requestIdOf(context.switchToHttp().getRequest<Request>());
    return next
      .handle()
      .pipe(
        map((data: unknown) => ({ data: data ?? null, meta: { requestId } })),
      );
  }
}
