import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

process.env.SYNC_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'petcare-ai-'));
process.env.AI_DAILY_LIMIT = '2';
delete process.env.SYNC_STORE;
delete process.env.GEMINI_API_KEY;

describe('AI daily budget', () => {
  it('rejects AI calls above the shared daily limit', async () => {
    const { createApp } = await import('../server.ts');
    const app = await createApp({ serveFrontend: false });
    const codes: number[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/api/scan-medical').send({ imageBase64: 'aGVsbG8=' });
      codes.push(res.status);
    }
    expect(codes.slice(0, 2)).not.toContain(429);
    expect(codes[2]).toBe(429);
  });
});
