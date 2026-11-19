import {
  Body,
  Controller,
  Get,
  INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { z } from 'zod';
import { AppModule } from './../src/app.module.js';
import { Public } from './../src/auth/auth.guard.js';
import { configureApp } from './../src/app.setup.js';
import { ZodValidationPipe } from './../src/common/zod-validation.pipe.js';

const EchoSchema = z.strictObject({ name: z.string().min(1) });

/** Test-only routes that exercise the API conventions. */
@Public()
@Controller('test-echo')
class EchoController {
  @Get() hello() {
    return { hello: 'world' };
  }
  @Get('boom') boom(): never {
    throw new Error('secret internals');
  }
  @Post() echo(
    @Body(new ZodValidationPipe(EchoSchema)) body: z.infer<typeof EchoSchema>,
  ) {
    return body;
  }
}
@Module({ controllers: [EchoController] })
class EchoModule {}

describe('API conventions (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, EchoModule],
    }).compile();
    app = configureApp(
      moduleFixture.createNestApplication(),
    ) as INestApplication<App>;
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves /health unversioned and without the envelope', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(['up', 'down']).toContain(res.body.database);
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('wraps responses under /api/v1 in { data, meta }', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/test-echo')
      .set('X-Request-Id', 'test-req-12345')
      .expect(200);
    expect(res.body).toEqual({
      data: { hello: 'world' },
      meta: { requestId: 'test-req-12345' },
    });
  });

  it('rejects invalid and unknown fields with VALIDATION_FAILED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/test-echo')
      .send({ name: '', organizationId: 'someone-else' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.meta.requestId).toBeTruthy();
  });

  it('returns NOT_FOUND in the error shape for unknown routes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/nope')
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('never leaks internals on unexpected errors', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/test-echo/boom')
      .expect(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('secret internals');
  });
});
