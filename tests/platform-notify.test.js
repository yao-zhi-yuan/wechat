import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import Module from 'node:module';

const require = createRequire(import.meta.url);
const notifyPath = require.resolve('../cloudfunctions/platformNotify/index.js');
const originalLoad = Module._load;

afterEach(() => {
  Module._load = originalLoad;
  delete require.cache[notifyPath];
  vi.restoreAllMocks();
});

describe('platformNotify cloud function', () => {
  it('ignores events without merchant trade number', async () => {
    const db = createPlatformDb({ orderRows: [], orderUpdate: vi.fn() });
    const api = loadPlatformNotifyWithDb(db);

    await expect(api.main({ Event: 'trade_manage_order_settlement' })).resolves.toEqual({
      errcode: 0,
      errmsg: 'ok'
    });
    expect(db.collection).not.toHaveBeenCalled();
  });

  it('ignores events without a matching order', async () => {
    const orderUpdate = vi.fn();
    const db = createPlatformDb({ orderRows: [], orderUpdate });
    const api = loadPlatformNotifyWithDb(db);

    await expect(api.main({
      Event: 'trade_manage_order_settlement',
      merchant_trade_no: 'W1'
    })).resolves.toEqual({
      errcode: 0,
      errmsg: 'ok'
    });
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('marks shipping upload as confirmed when settlement event matches an order', async () => {
    const orderUpdate = vi.fn(async () => ({}));
    const db = createPlatformDb({
      orderRows: [{
        _id: 'order-1',
        orderNo: 'W1',
        wechatShippingUploadedAt: new Date('2026-06-30T00:00:00.000Z')
      }],
      orderUpdate
    });
    const api = loadPlatformNotifyWithDb(db);

    await expect(api.main({
      Event: 'trade_manage_order_settlement',
      merchant_trade_no: 'W1',
      shipped_time: 1782864000
    })).resolves.toEqual({
      errcode: 0,
      errmsg: 'ok'
    });
    expect(orderUpdate).toHaveBeenCalledWith({
      data: {
        wechatShippingUploadStatus: 'uploaded',
        wechatShippingUploadedAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: expect.any(Date)
      }
    });
  });
});

function loadPlatformNotifyWithDb(db) {
  const cloud = {
    DYNAMIC_CURRENT_ENV: 'dynamic-current-env',
    init: vi.fn(),
    database: vi.fn(() => db)
  };
  Module._load = function load(request, parent, isMain) {
    if (request === 'wx-server-sdk') {
      return cloud;
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  const api = require(notifyPath);
  Module._load = originalLoad;
  return api;
}

function createPlatformDb({ orderRows, orderUpdate }) {
  const orderQuery = createQuery(orderRows);
  return {
    collection: vi.fn((name) => {
      if (name !== 'orders') {
        throw new Error(`unexpected collection: ${name}`);
      }
      return {
        where: vi.fn(() => orderQuery),
        doc: vi.fn(() => ({ update: orderUpdate }))
      };
    })
  };
}

function createQuery(data) {
  const query = {
    limit: vi.fn(() => query),
    get: vi.fn(async () => ({ data }))
  };
  return query;
}
