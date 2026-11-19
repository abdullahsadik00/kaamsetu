import { HttpStatus, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { AppError } from './app-error.js';
import { toErrorBody } from './http-exception.filter.js';
import { maskPhone } from './request-context.middleware.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('toErrorBody', () => {
  it('keeps the code, message and details of an AppError', () => {
    const { status, body } = toErrorBody(
      new AppError(
        HttpStatus.CONFLICT,
        'VERSION_CONFLICT',
        'Updated elsewhere.',
        { v: 3 },
      ),
      'req-1',
    );
    expect(status).toBe(409);
    expect(body).toEqual({
      error: {
        code: 'VERSION_CONFLICT',
        message: 'Updated elsewhere.',
        details: { v: 3 },
      },
      meta: { requestId: 'req-1' },
    });
  });

  it('maps Nest HTTP exceptions to a stable code', () => {
    const { status, body } = toErrorBody(new NotFoundException(), 'req-2');
    expect(status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('hides the details of unexpected errors', () => {
    const { status, body } = toErrorBody(
      new Error('db password is hunter2'),
      'req-3',
    );
    expect(status).toBe(500);
    expect(body.error).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
    });
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(
    z.strictObject({ name: z.string().min(1) }),
  );

  it('returns parsed data when valid', () => {
    expect(pipe.transform({ name: 'Cool Care' })).toEqual({
      name: 'Cool Care',
    });
  });

  it('rejects unknown fields and reports each problem', () => {
    try {
      pipe.transform({ name: '', organizationId: 'x' });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      const err = e as AppError;
      expect(err.code).toBe('VALIDATION_FAILED');
      expect(err.status).toBe(400);
      expect(Array.isArray(err.details)).toBe(true);
      expect((err.details as unknown[]).length).toBe(2);
    }
  });
});

describe('maskPhone', () => {
  it('keeps only the last 4 digits', () => {
    expect(maskPhone('+91 98220 12345')).toBe('********2345');
    expect(maskPhone('123')).toBe('****');
  });
});
