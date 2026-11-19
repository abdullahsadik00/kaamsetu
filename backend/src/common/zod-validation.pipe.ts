import { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { AppError } from './app-error.js';

/**
 * Validates a request part against a Zod schema. Use strict object schemas
 * (`z.strictObject`) so unknown fields are rejected (docs/10 §5).
 *
 * @example
 *   @Post() create(@Body(new ZodValidationPipe(CreateCustomerSchema)) dto: CreateCustomer) {}
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw AppError.validation(
        result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      );
    }
    return result.data;
  }
}
