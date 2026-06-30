import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import Module from 'node:module';

const require = createRequire(import.meta.url);
const notifyPath = require.resolve('../cloudfunctions/payNotify/index.js');
const originalLoad = Module._load;

afterEach(() => {
  Module._load = originalLoad;
  delete require.cache[notifyPath];
  vi.restoreAllMocks();
});

describe('payNotify cloud function', () => {
  it('marks matching orders and payments as paid', async () => {
    const orderUpdate = vi.fn(async () => ({}));
    const paymentUpdate = vi.fn(async () => ({}));
    const db = createNotifyDb({
      orderRows: [{ _id: 'order-1', orderNo: 'W1', payStatus: 'not_paid' }],
      paymentRows: [{ _id: 'payment-1', outTradeNo: 'W1' }],
      orderUpdate,
      paymentUpdate
    });
    const api = loadNotifyWithDb(db);

    await expect(api.main({ outTradeNo: 'W1', transactionId: 'tx-1' })).resolves.toEqual({
      errcode: 0,
      errmsg: 'ok'
    });
    expect(orderUpdate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'paid_waiting_delivery',
        payStatus: 'paid',
        wechatTransactionId: 'tx-1'
      })
    });
    expect(paymentUpdate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'success',
        transactionId: 'tx-1',
        callbackSummary: { orderNo: 'W1', transactionId: 'tx-1' }
      })
    });
  });

  it('is idempotent for already paid orders', async () => {
    const orderUpdate = vi.fn();
    const paymentUpdate = vi.fn();
    const db = createNotifyDb({
      orderRows: [{ _id: 'order-1', orderNo: 'W1', payStatus: 'paid' }],
      paymentRows: [{ _id: 'payment-1', outTradeNo: 'W1' }],
      orderUpdate,
      paymentUpdate
    });
    const api = loadNotifyWithDb(db);

    await expect(api.main({ out_trade_no: 'W1', transaction_id: 'tx-1' })).resolves.toEqual({
      errcode: 0,
      errmsg: 'ok'
    });
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(paymentUpdate).not.toHaveBeenCalled();
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

function createNotifyDb({ orderRows, paymentRows, orderUpdate, paymentUpdate }) {
  const orderQuery = createQuery(orderRows);
  const paymentQuery = createQuery(paymentRows);
  return {
    collection: vi.fn((name) => {
      if (name === 'orders') {
        return {
          where: vi.fn(() => orderQuery),
          doc: vi.fn(() => ({ update: orderUpdate }))
        };
      }
      if (name === 'payments') {
        return {
          where: vi.fn(() => paymentQuery),
          doc: vi.fn(() => ({ update: paymentUpdate }))
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
