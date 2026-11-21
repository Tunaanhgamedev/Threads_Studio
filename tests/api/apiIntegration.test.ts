process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { app } from '../../server/src/index.js';
import type { Server } from 'http';

describe('API Integration Smoke Tests', () => {
  let server: Server;
  const TEST_PORT = 3299;
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(TEST_PORT, '127.0.0.1', () => resolve());
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  test('API Health: GET /api/health trả về status ok', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.service, 'Threads Content Studio API');
  });

  test('API Reliability: GET /api/reliability/health trả về báo cáo 7 dịch vụ', async () => {
    const res = await fetch(`${BASE_URL}/api/reliability/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.strictEqual(data.success, true);
    assert.ok(data.data.services.sqlite);
    assert.ok(data.data.services.ffmpeg);
  });

  test('API Desktop Status: GET /api/desktop/status trả về runtime metadata', async () => {
    const res = await fetch(`${BASE_URL}/api/desktop/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.deepLinkProtocol, 'threads-studio://');
    assert.strictEqual(data.data.port, 3210);
  });

  test('API Templates: GET /api/templates trả về danh sách template video có sẵn', async () => {
    const res = await fetch(`${BASE_URL}/api/templates`);
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any;
    assert.ok(Array.isArray(data) || Array.isArray(data.templates));
  });
});
