import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import Module from 'node:module';

const require = createRequire(import.meta.url);
const apiPath = require.resolve('../cloudfunctions/api/index.js');
const originalLoad = Module._load;

function loadApiWithCloud(cloudOverrides = {}) {
  delete require.cache[apiPath];

  const cloud = {
    DYNAMIC_CURRENT_ENV: 'dynamic-current-env',
    init: vi.fn(),
    getWXContext: vi.fn(() => ({ OPENID: 'openid-1', APPID: 'appid-1' })),
    database: vi.fn(() => ({})),
    ...cloudOverrides
  };

  Module._load = function load(request, parent, isMain) {
    if (request === 'wx-server-sdk') {
      return cloud;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  const api = require(apiPath);
  Module._load = originalLoad;

  return { api, cloud };
}

afterEach(() => {
  Module._load = originalLoad;
  delete require.cache[apiPath];
  vi.restoreAllMocks();
});

describe('cloud api router', () => {
  it('returns UNKNOWN_ACTION for unknown actions', async () => {
    const { api } = loadApiWithCloud();

    await expect(api.main({ action: 'missing' })).resolves.toEqual({
      ok: false,
      error: { code: 'UNKNOWN_ACTION', message: '未知操作' }
    });
  });

  it('returns UNKNOWN_ACTION for inherited action names', async () => {
    const { api } = loadApiWithCloud();

    await expect(api.main({ action: 'constructor' })).resolves.toEqual({
      ok: false,
      error: { code: 'UNKNOWN_ACTION', message: '未知操作' }
    });
  });

  it('returns INTERNAL_ERROR when context creation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { api } = loadApiWithCloud({
      database: vi.fn(() => {
        throw new Error('database unavailable');
      })
    });

    await expect(api.main({ action: 'ping' })).resolves.toEqual({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: '服务暂时不可用' }
    });
  });

  it('returns pong for ping', async () => {
    const { api } = loadApiWithCloud();

    await expect(api.main({ action: 'ping' })).resolves.toEqual({
      ok: true,
      data: { pong: true }
    });
  });
});
