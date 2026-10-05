import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'petcare-test-'));
process.env.SYNC_DATA_DIR = dataDir;
delete process.env.SYNC_STORE;

let app: Express;
const email = `user${Date.now()}@example.com`;
const password = 'correct-horse-battery';

const readDb = () => JSON.parse(fs.readFileSync(path.join(dataDir, 'cloud_sync_db.json'), 'utf8'));

beforeAll(async () => {
  const mod = await import('../server.ts');
  app = (await mod.createApp({ serveFrontend: false })) as Express;
});

describe('cloud sync API', () => {
  let token = '';

  it('registers and returns a session token stored only as a hash', async () => {
    const res = await request(app).post('/api/cloud-sync/auth').send({ email, password, action: 'register' });
    expect(res.status).toBe(200);
    token = res.body.token;
    expect(token).toMatch(/^tok_[0-9a-f]{64}$/);
    const stored = readDb().users[email];
    expect(JSON.stringify(stored)).not.toContain(token);
    expect(stored.sessions).toHaveLength(1);
  });

  it('rejects a wrong password and an unverified Google login', async () => {
    const bad = await request(app).post('/api/cloud-sync/auth').send({ email, password: 'nope-nope', action: 'login' });
    expect(bad.status).toBeGreaterThanOrEqual(400);
    const google = await request(app).post('/api/cloud-sync/auth').send({ email, provider: 'google', accessToken: 'gis_oauth_fake' });
    expect(google.status).toBeGreaterThanOrEqual(400);
  });

  it('uploads and downloads a payload with a valid token only', async () => {
    const payload = { pets: [{ id: 'p1', name: 'Burek' }] };
    const up = await request(app).post('/api/cloud-sync/upload').send({ email, token, payload });
    expect(up.status).toBe(200);
    const down = await request(app).post('/api/cloud-sync/download').send({ email, token });
    expect(down.status).toBe(200);
    expect(JSON.stringify(down.body)).toContain('Burek');
    const forged = await request(app).post('/api/cloud-sync/download').send({ email, token: 'tok_' + '0'.repeat(64) });
    expect(forged.status).toBe(401);
  });

  it('keeps multiple device sessions valid after a second login', async () => {
    const login = await request(app).post('/api/cloud-sync/auth').send({ email, password, action: 'login' });
    expect(login.status).toBe(200);
    expect(login.body.token).not.toBe(token);
    for (const t of [token, login.body.token]) {
      const res = await request(app).post('/api/cloud-sync/download').send({ email, token: t });
      expect(res.status).toBe(200);
    }
  });

  it('pairs a second phone with a 6-digit code', async () => {
    const gen = await request(app).post('/api/cloud-sync/generate-code').send({ email, token });
    expect(gen.status).toBe(200);
    expect(gen.body.code).toMatch(/^\d{6}$/);
    const pair = await request(app).post('/api/cloud-sync/pair-code').send({ code: gen.body.code });
    expect(pair.status).toBe(200);
    expect(pair.body.token).toBeTruthy();
  });

  it('migrates a legacy plaintext token to a hashed session on first use', async () => {
    const legacyEmail = `legacy${Date.now()}@example.com`;
    const legacyToken = 'tok_' + 'a'.repeat(64);
    const db = readDb();
    db.users[legacyEmail] = { email: legacyEmail, token: legacyToken, tokenCreatedAt: Date.now(), payload: { pets: [] } };
    fs.writeFileSync(path.join(dataDir, 'cloud_sync_db.json'), JSON.stringify(db));
    const res = await request(app).post('/api/cloud-sync/download').send({ email: legacyEmail, token: legacyToken });
    expect(res.status).toBe(200);
    const stored = readDb().users[legacyEmail];
    expect(stored.token).toBeUndefined();
    expect(stored.sessions).toHaveLength(1);
  });

  it('limits request body size on small routes', async () => {
    const big = 'x'.repeat(2 * 1024 * 1024);
    const res = await request(app).post('/api/cloud-sync/download').send({ email, token, big });
    expect(res.status).toBe(413);
  });

  it('sends security headers', async () => {
    const res = await request(app).post('/api/cloud-sync/download').send({ email, token });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('deletes the account', async () => {
    const del = await request(app).delete('/api/cloud-sync/account').send({ email, token });
    expect(del.status).toBe(200);
    const after = await request(app).post('/api/cloud-sync/download').send({ email, token });
    expect(after.status).toBe(404);
  });
});
