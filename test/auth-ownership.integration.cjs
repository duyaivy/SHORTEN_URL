// Run against an isolated MongoDB replica set after building the real Nest classes.
require('reflect-metadata');
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const { ConfigService } = require('@nestjs/config');
const { ValidationPipe } = require('@nestjs/common');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const load = (path) => require(`../dist/${path}`);
const { AuthController } = load('modules/auth/presentation/controllers/auth.controller');
const { ShortUrlController } = load('modules/short-url/presentation/controllers/short-url.controller');
const { TokenService } = load('modules/auth/application/ports/token');
const { JWTTokenService } = load('modules/auth/infrastructure/jwt-token.services');
const { PrismaShortUrlRepository } = load('modules/short-url/infrastructure/prisma-short-url.repository');
const { PrismaRefreshTokenRepository } = load('modules/auth/infrastructure/prisma-refresh-token.repository');
const { CreateShortUrlUseCase } = load('modules/short-url/application/use-cases/create-short-url.usecase');
const { GetMyUrlsUseCase } = load('modules/short-url/application/use-cases/get-my-urls.usecase');
const { RefreshTokenUseCase } = load('modules/auth/application/use-cases/refresh-token.usecase');
const { LogoutUseCase } = load('modules/auth/application/use-cases/logout.usecase');
const { AllExceptionsFilter } = load('shared/filters/all-exceptions.filter');
const { mutationOriginGuard } = load('shared/config/http-security');
const dbUrl = process.env.AUTH_TEST_DATABASE_URL;
if (!dbUrl || !new URL(dbUrl).pathname.startsWith('/shortlink_auth_test')) throw new Error('AUTH_TEST_DATABASE_URL must name an isolated shortlink_auth_test* database');
const origin = 'https://short.test';
const secret = 'isolated-test-secret';
const config = new ConfigService({ SECRET_OR_PUBLIC_JWT_KEY: secret, ACCESS_TOKEN_EXPIRATION_TIME: '1h', REFRESH_TOKEN_EXPIRATION_TIME: '3d', SERVER_ALIAS_URL: origin });
const tokens = new JWTTokenService(config);
const db = new PrismaClient({ datasources: { db: { url: dbUrl } } });
const urls = new PrismaShortUrlRepository(db);
const refreshes = new PrismaRefreshTokenRepository(db);
let app, owner, other;
const access = (id, expiresIn = '1h', type = 0) => jwt.sign({ userId: id, type }, secret, { expiresIn });
const cookies = (res) => res.headers['set-cookie'].map((c) => c.split(';')[0]);
function post(cookie, intent) {
  let req = request(app.getHttpServer()).post('/api/').set('Origin', origin);
  if (cookie) req = req.set('Cookie', cookie);
  if (intent) req = req.set('X-Auth-Intent', intent);
  return req.send({ url: 'https://example.com/resource' });
}
const refresh = (cookie) => request(app.getHttpServer()).post('/api/auth/refresh-token').set('Origin', origin).set('Cookie', cookie).send({});
async function refreshCookie() {
  const token = await tokens.generateRefreshToken({ userId: owner.id, type: 1 });
  await refreshes.create({ tokenHash: PrismaRefreshTokenRepository.hashToken(token), userId: owner.id, expiresAt: new Date(Date.now() + 86400000) });
  return `refresh_token=${token}`;
}
before(async () => {
  await db.$connect();
  owner = await db.user.create({ data: { email: 'owner@test.local', password: 'unused' } });
  other = await db.user.create({ data: { email: 'other@test.local', password: 'unused' } });
  const implementations = new Map([
    ['CreateShortUrlUseCase', new CreateShortUrlUseCase(urls, { hash: async () => 'hashed' }, config)],
    ['GetMyUrlsUseCase', new GetMyUrlsUseCase(urls, config)],
    ['RefreshTokenUseCase', new RefreshTokenUseCase(tokens, refreshes, config)],
    ['LogoutUseCase', new LogoutUseCase(refreshes)],
    ['GetMeUseCase', { execute: async (id) => { const user = await db.user.findUniqueOrThrow({ where: { id } }); return { ...user, password: undefined }; } }],
    ['LoginUseCase', { execute: async () => ({ accessToken: access(owner.id), refreshToken: (await refreshCookie()).slice(14), user: { id: owner.id } }) }],
    ['ConfigService', config],
  ]);
  const dependencies = new Set([AuthController, ShortUrlController].flatMap((c) => Reflect.getMetadata('design:paramtypes', c)));
  const module = await Test.createTestingModule({ controllers: [AuthController, ShortUrlController], providers: [
    { provide: TokenService, useValue: tokens },
    ...[...dependencies].map((dep) => ({ provide: dep, useValue: implementations.get(dep.name) ?? { execute: async () => { throw new Error(`Unexpected use case ${dep.name}`); } } })),
  ] }).compile();
  app = module.createNestApplication();
  app.useLogger(false);
  app.use(require('cookie-parser')());
  app.use(mutationOriginGuard(origin));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
});
beforeEach(async () => { await db.shortUrl.deleteMany(); await db.refreshToken.deleteMany(); });
after(async () => {
  if (app) await app.close();
  await db.shortUrl.deleteMany(); await db.refreshToken.deleteMany(); await db.user.deleteMany(); await db.$disconnect();
});
describe('HTTP creation and actual MongoDB ownership', () => {
  it('creates a genuine guest URL with missing cookies', async () => {
    assert.equal((await post()).status, 201);
    const rows = await db.shortUrl.findMany();
    assert.equal(rows.length, 1); assert.equal(rows[0].owner_id, null); assert.ok(rows[0].exp);
  });
  it('persists verified identity and lists the URL only for its owner', async () => {
    const cookie = `access_token=${access(owner.id)}`;
    assert.equal((await post(cookie)).status, 201);
    const rows = await db.shortUrl.findMany();
    assert.equal(rows.length, 1); assert.equal(rows[0].owner_id, owner.id); assert.equal(rows[0].exp, null);
    for (const id of [owner.id, other.id]) {
      const list = await request(app.getHttpServer()).get('/api/my-urls').set('Cookie', `access_token=${access(id)}`);
      assert.equal(list.status, 200); assert.equal(list.body.data.data.length, id === owner.id ? 1 : 0);
    }
  });
  for (const kind of ['expired', 'malformed', 'empty', 'refresh-as-access', 'missing-required']) {
    it(`rejects ${kind} before any write`, async () => {
      const cookie = kind === 'expired' ? `access_token=${access(owner.id, -1)}` : kind === 'malformed' ? 'access_token=bad' : kind === 'empty' ? 'access_token=' : kind === 'refresh-as-access' ? `access_token=${access(owner.id, '1h', 1)}` : undefined;
      const res = await post(cookie, 'required');
      assert.equal(res.status, 401); assert.equal(res.body.data.code, 'SESSION_REQUIRED'); assert.equal(await db.shortUrl.count(), 0);
    });
  }
  for (const expiredCookie of [true, false]) {
    it(`refreshes ${expiredCookie ? 'expired' : 'browser-removed'} access and creates exactly once`, async () => {
      const old = await refreshCookie();
      const initial = [old, ...(expiredCookie ? [`access_token=${access(owner.id, -1)}`] : [])];
      assert.equal((await post(initial)).status, 401); assert.equal(await db.shortUrl.count(), 0);
      const renewed = await refresh(initial);
      assert.equal(renewed.status, 201); assert.equal(renewed.body.data, null);
      assert.notEqual(cookies(renewed).find((c) => c.startsWith('refresh_token=')), old);
      assert.equal((await post(cookies(renewed), 'required')).status, 201);
      assert.equal(await db.shortUrl.count(), 1); assert.equal((await db.shortUrl.findFirst()).owner_id, owner.id);
      assert.equal((await refresh([old])).status, 401);
    });
  }
  for (const kind of ['missing', 'malformed', 'expired', 'revoked']) {
    it(`rejects ${kind} refresh without guest fallback`, async () => {
      const token = kind === 'missing' ? '' : kind === 'malformed' ? 'bad' : access(owner.id, kind === 'expired' ? -1 : '1h', 1);
      const cookie = `refresh_token=${token}`;
      assert.equal((await post(cookie)).status, 401); assert.equal((await refresh([cookie])).status, 401); assert.equal(await db.shortUrl.count(), 0);
    });
  }
  it('restores /me using the renewed cookie', async () => {
    const old = await refreshCookie();
    assert.equal((await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', old)).status, 401);
    const renewed = await refresh([old]);
    const me = await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookies(renewed));
    assert.equal(me.status, 200); assert.equal(me.body.data.id, owner.id);
  });
  it('has only one concurrent rotation winner and retains that session', async () => {
    const old = await refreshCookie();
    const results = await Promise.all([refresh([old]), refresh([old])]);
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 401]); assert.equal(await db.refreshToken.count(), 1);
    assert.equal((await refresh(cookies(results.find((r) => r.status === 201)))).status, 201);
  });
  it('issues secure host-only cookies without JSON tokens; logout revokes refresh', async () => {
    const login = await request(app.getHttpServer()).post('/api/auth/login').set('Origin', origin).send({ email: 'owner@test.local', password: 'Password123!' });
    assert.equal(login.status, 201); assert.equal(login.body.data.accessToken, undefined);
    for (const cookie of login.headers['set-cookie']) {
      for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', 'Max-Age=']) assert.ok(cookie.includes(flag));
      assert.ok(!cookie.includes('Domain='));
    }
    const session = cookies(login);
    assert.equal((await request(app.getHttpServer()).delete('/api/auth/logout').set('Origin', origin).set('Cookie', session)).status, 200);
    assert.equal((await refresh(session)).status, 401);
  });
  it('rejects foreign and missing origins on cookie mutations', async () => {
    for (const source of ['https://evil.short.test', undefined]) {
      let req = request(app.getHttpServer()).post('/api/').set('Cookie', `access_token=${access(owner.id)}`);
      if (source) req = req.set('Origin', source);
      assert.equal((await req.send({ url: 'https://example.com' })).status, 403);
    }
    assert.equal(await db.shortUrl.count(), 0);
  });
  it('rejects client-supplied identity', async () => {
    const res = await request(app.getHttpServer()).post('/api/').set('Origin', origin).send({ url: 'https://example.com', userId: owner.id });
    assert.equal(res.status, 400); assert.equal(await db.shortUrl.count(), 0);
  });
  it('returns an error when persistence fails instead of reporting success', async () => {
    const original = urls.create;
    urls.create = async () => { throw new Error('Simulated database write failure'); };
    try {
      assert.equal((await post(`access_token=${access(owner.id)}`)).status, 500);
      assert.equal(await db.shortUrl.count(), 0);
    } finally { urls.create = original; }
  });
  it('keeps the old refresh valid when the rotation write fails', async () => {
    const old = await refreshCookie();
    const original = refreshes.rotate;
    refreshes.rotate = async () => { throw new Error('Simulated rotation write failure'); };
    try {
      assert.equal((await refresh([old])).status, 500);
      assert.equal(await db.refreshToken.count(), 1);
      assert.equal(await db.shortUrl.count(), 0);
    } finally { refreshes.rotate = original; }
    assert.equal((await refresh([old])).status, 201);
  });

});
