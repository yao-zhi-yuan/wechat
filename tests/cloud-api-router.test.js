import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import Module from 'node:module';

const require = createRequire(import.meta.url);
const apiPath = require.resolve('../cloudfunctions/api/index.js');
const originalLoad = Module._load;

function loadApiWithCloud(cloudOverrides = {}, shopModule, productsModule, ordersModule) {
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
    if (request === './lib/shop' && shopModule) {
      return shopModule;
    }
    if (request === './lib/products' && productsModule) {
      return productsModule;
    }
    if (request === './lib/orders' && ordersModule) {
      return ordersModule;
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

  it('preserves expected application errors from actions', async () => {
    const forbidden = new Error('需要管理员权限');
    forbidden.code = 'FORBIDDEN';
    const { api } = loadApiWithCloud({}, {
      getShopConfig: async () => {
        throw forbidden;
      },
      getSession: async () => ({ ok: true, data: {} })
    });

    await expect(api.main({ action: 'getShopConfig' })).resolves.toEqual({
      ok: false,
      error: { code: 'FORBIDDEN', message: '需要管理员权限' }
    });
  });

  it('keeps unexpected action errors generic', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { api } = loadApiWithCloud({}, {
      getShopConfig: async () => {
        throw new Error('database secret detail');
      },
      getSession: async () => ({ ok: true, data: {} })
    });

    await expect(api.main({ action: 'getShopConfig' })).resolves.toEqual({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: '服务暂时不可用' }
    });
  });

  it('keeps unexpected coded action errors generic', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const sdkError = new Error('socket disconnected');
    sdkError.code = 'ECONNRESET';
    const { api } = loadApiWithCloud({}, {
      getShopConfig: async () => {
        throw sdkError;
      },
      getSession: async () => ({ ok: true, data: {} })
    });

    await expect(api.main({ action: 'getShopConfig' })).resolves.toEqual({
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

  it('routes listProducts actions', async () => {
    const listProducts = vi.fn(async (data) => ({
      ok: true,
      data: { categories: [], products: [], requestData: data }
    }));
    const { api } = loadApiWithCloud({}, undefined, { listProducts });

    await expect(api.main({
      action: 'listProducts',
      data: { includeHidden: false }
    })).resolves.toEqual({
      ok: true,
      data: { categories: [], products: [], requestData: { includeHidden: false } }
    });
    expect(listProducts).toHaveBeenCalledOnce();
  });

  it('preserves validation errors from order actions', async () => {
    const validationError = new Error('请选择商品');
    validationError.code = 'VALIDATION_ERROR';
    const createOrder = vi.fn(async () => {
      throw validationError;
    });
    const { api } = loadApiWithCloud({}, undefined, undefined, { createOrder });

    await expect(api.main({ action: 'createOrder', data: { items: [] } })).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: '请选择商品' }
    });
    expect(createOrder).toHaveBeenCalledOnce();
  });
});
