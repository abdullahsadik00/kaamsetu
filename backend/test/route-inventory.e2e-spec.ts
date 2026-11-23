import { randomUUID } from 'node:crypto';
import { INestApplication, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { ModulesContainer } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { API_PREFIX, configureApp } from '../src/app.setup.js';
import { ALL_ROLES, ROLES_KEY, type Role } from '../src/auth/roles.js';
import { FEATURE_KEY } from '../src/organization/features.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX = '90000059';

type Route = { method: string; path: string; roles: Role[] | 'public' | 'signed-in'; feature?: string };

/** Every HTTP route with who may call it, read from the controllers' metadata. */
function routes(app: INestApplication): Route[] {
  const out: Route[] = [];
  for (const mod of app.get(ModulesContainer).values()) {
    for (const wrapper of mod.controllers.values()) {
      const ctrl = wrapper.metatype as (new (...a: never[]) => object) | null;
      if (!ctrl) continue;
      const base = [Reflect.getMetadata(PATH_METADATA, ctrl) ?? ''].flat()[0] as string;
      for (const name of Object.getOwnPropertyNames(ctrl.prototype)) {
        const handler = (ctrl.prototype as Record<string, unknown>)[name];
        if (name === 'constructor' || typeof handler !== 'function') continue;
        const sub = Reflect.getMetadata(PATH_METADATA, handler) as string | string[] | undefined;
        if (sub === undefined) continue;
        const method = RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod];
        const isPublic = Reflect.getMetadata('kaamsetu:public', handler) ?? Reflect.getMetadata('kaamsetu:public', ctrl);
        const roles = (Reflect.getMetadata(ROLES_KEY, handler) ?? Reflect.getMetadata(ROLES_KEY, ctrl)) as Role[] | undefined;
        const path = `/${[API_PREFIX, base, [sub].flat()[0]].filter(Boolean).join('/')}`.replace(/\/+/g, '/').replace(/\/$/, '');
        // Business-type gate (D-044), when the route has one.
        const feature = (Reflect.getMetadata(FEATURE_KEY, handler) ?? Reflect.getMetadata(FEATURE_KEY, ctrl)) as string | undefined;
        out.push({ method, path, roles: isPublic ? 'public' : (roles ?? 'signed-in'), ...(feature ? { feature } : {}) });
      }
    }
  }
  return out.sort((a, b) => `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`));
}

/** Signed-in routes that need no business (login, profile, setting up or joining one, help). Anything else must name roles. */
const NO_BUSINESS_NEEDED = /^\/api\/v1\/(auth|me|organizations$|invites\/accept|account|health|support$)/;

describe('Every route: roles and login (e2e, T5.2)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let a: TestTenant;
  let all: Route[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX]);
    a = await factory.create('Inventory A', PREFIX);
    all = routes(app);
  });

  afterAll(async () => {
    await factory.cleanUp();
    await app.close();
  });

  it('the inventory matches the reviewed list (a new route or role change shows up here)', () => {
    expect(all.length).toBeGreaterThan(40);
    expect(all.map((r) => `${r.method.padEnd(6)} ${r.path}  ${Array.isArray(r.roles) ? r.roles.join(',') : r.roles}${r.feature ? `  [${r.feature}]` : ''}`)).toMatchSnapshot();
  });

  it('business routes always name their roles', () => {
    const loose = all.filter((r) => r.roles === 'signed-in' && !NO_BUSINESS_NEEDED.test(r.path));
    expect(loose).toEqual([]);
  });

  const call = (r: Route, token?: string) => {
    const path = r.path.replace(/:[A-Za-z]+/g, () => randomUUID());
    const req = http(r.method.toLowerCase() as 'get')(path);
    return token ? req.set('Authorization', `Bearer ${token}`).send({}) : req.send({});
  };
  const http = (m: 'get') => (p: string) => request(app.getHttpServer())[m](p);

  it('no token: every non-public route answers 401', async () => {
    for (const r of all.filter((x) => x.roles !== 'public')) {
      const res = await call(r);
      expect([r.method, r.path, res.status]).toEqual([r.method, r.path, 401]);
    }
  });

  it('each role is refused (403) on every route not open to it', async () => {
    const token: Record<Role, string> = { OWNER: a.tokens.OWNER, SENIOR_TECHNICIAN: a.tokens.SENIOR_TECHNICIAN, HELPER: a.tokens.HELPER };
    for (const r of all) {
      if (!Array.isArray(r.roles)) continue;
      for (const role of ALL_ROLES.filter((x) => !(r.roles as Role[]).includes(x))) {
        const res = await call(r, token[role]);
        expect([r.method, r.path, role, res.status, res.body?.error?.code]).toEqual([r.method, r.path, role, 403, 'FORBIDDEN_ROLE']);
      }
    }
  });
});
