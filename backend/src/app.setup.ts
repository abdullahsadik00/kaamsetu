import { RequestMethod, type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { requestContext } from './common/request-context.middleware.js';
import { ResponseEnvelopeInterceptor } from './common/response-envelope.interceptor.js';

export const API_PREFIX = 'api/v1';

/**
 * Applies the API conventions from docs/06 §1 and docs/11 §4–6.
 * Shared by main.ts and the e2e tests so both run the same pipeline.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.use(requestContext);
  // /health stays outside the version prefix for load balancers and uptime
  // checks; so do the public homepage, privacy policy and terms.
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [
      'health',
      { path: '/', method: RequestMethod.GET },
      { path: 'privacy', method: RequestMethod.GET },
      { path: 'terms', method: RequestMethod.GET },
    ],
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new ResponseEnvelopeInterceptor(app.get(Reflector)),
  );
  app.enableShutdownHooks();
  return app;
}
