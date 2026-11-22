import type { NextFunction, Request, Response } from 'express';

/**
 * Security headers on every answer (docs/10 §5). The API serves JSON and a
 * few plain HTML pages (home, privacy, terms, delete-account) with inline
 * styles only: no scripts, frames, forms or outside resources are allowed.
 * HSTS only when the request came over HTTPS (Render terminates TLS).
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  );
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}
