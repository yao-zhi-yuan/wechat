import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import Module from 'node:module';

const require = createRequire(import.meta.url);
const notifyPath = require.resolve('../cloudfunctions/refundNotify/index.js');
const originalLoad = Module._load;

afterEach(() => {
  Module._load = originalLoad;
  delete require.cache[notifyPath];
  vi.restoreAllMocks();
});

describe('refundNotify cloud function', () => {
  it('marks matching refunds and orders as refunded', async () => {
    const refundUpdate = vi.fn(async () => ({}));
    const orderUpdate = vi.fn(async () => ({}));
    const db = createNotifyDb({
      refundRows: [{ _id: 'refund-1', orderId: 'order-1', outRefundNo: 'R1', status: 'processing' }],
      refundUpdate,
      orderUpdate
    });
    const api = loadNotifyWithDb(db);

    await expect(api.main({ outRefundNo: 'R1', refundId: 'refund-id-1' })).resolves.toEqual({
      errcode: 0,
      errmsg: 'ok'
    });
    expect(refundUpdate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'success',
        refundId: 'refund-id-1',
        callbackSummary: { outRefundNo: 'R1', refundId: 'refund-id-1' },
        callbackReceivedAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
    });
    expect(orderUpdate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'refunded',
        payStatus: 'refunded',
        refundStatus: 'success',
        updatedAt: expect.any(Date)
      })
    });
  });

  it('ignores unknown refund callbacks', async () => {
    const refundUpdate = vi.fn();
    const orderUpdate = vi.fn();
    const db = createNotifyDb({
      refundRows: [],
      refundUpdate,
      orderUpdate
    });
    const api = loadNotifyWithDb(db);

    await expect(api.main({ out_refund_no: 'missing' })).resolves.toEqual({
      errcode: 0,
      errmsg: 'ok'
    });
    expect(refundUpdate).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });
});

function loadNotifyWithDb(db) {
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

function createNotifyDb({ refundRows, refundUpdate, orderUpdate }) {
  const refundQuery = createQuery(refundRows);
  return {
    collection: vi.fn((name) => {
      if (name === 'refunds') {
        return {
          where: vi.fn(() => refundQuery),
          doc: vi.fn(() => ({ update: refundUpdate }))
        };
      }
      if (name === 'orders') {
        return {
          doc: vi.fn(() => ({ update: orderUpdate }))
        };
      }
      throw new Error(`unexpected collection: ${name}`);
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
