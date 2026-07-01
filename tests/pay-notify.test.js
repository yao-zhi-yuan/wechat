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

  it('keeps payment callback successful when new order notice sending fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const originalTemplateId = process.env.NEW_ORDER_TEMPLATE_ID;
    process.env.NEW_ORDER_TEMPLATE_ID = 'tmpl-new-order';
    const orderUpdate = vi.fn(async () => ({}));
    const paymentUpdate = vi.fn(async () => ({}));
    const send = vi.fn(async () => {
      throw new Error('subscribe send failed');
    });
    const db = createNotifyDb({
      orderRows: [{
        _id: 'order-1',
        orderNo: 'W1',
        payStatus: 'not_paid',
        payAmountFen: 1234,
        receiverAddress: '北京市朝阳区测试地址一号'
      }],
      paymentRows: [{ _id: 'payment-1', outTradeNo: 'W1' }],
      adminRows: [{ _id: 'admin-1', openId: 'admin-openid', enabled: true, newOrderNoticeEnabled: true }],
      orderUpdate,
      paymentUpdate
    });
    const api = loadNotifyWithDb(db, {
      openapi: { subscribeMessage: { send } }
    });

    try {
      await expect(api.main({ outTradeNo: 'W1', transactionId: 'tx-1' })).resolves.toEqual({
        errcode: 0,
        errmsg: 'ok'
      });
      expect(orderUpdate).toHaveBeenCalledOnce();
      expect(paymentUpdate).toHaveBeenCalledOnce();
      expect(send).toHaveBeenCalledWith({
        touser: 'admin-openid',
        templateId: 'tmpl-new-order',
        page: '/pages/admin/order-detail/index?id=order-1',
        data: {
          thing1: { value: '新订单待配送' },
          amount2: { value: '12.34元' },
          thing3: { value: '北京市朝阳区测试地址一号' }
        }
      });
    } finally {
      process.env.NEW_ORDER_TEMPLATE_ID = originalTemplateId;
    }
  });

  it('keeps payment callback successful when notice OpenAPI is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const originalTemplateId = process.env.NEW_ORDER_TEMPLATE_ID;
    process.env.NEW_ORDER_TEMPLATE_ID = 'tmpl-new-order';
    const orderUpdate = vi.fn(async () => ({}));
    const paymentUpdate = vi.fn(async () => ({}));
    const db = createNotifyDb({
      orderRows: [{
        _id: 'order-1',
        orderNo: 'W1',
        payStatus: 'not_paid',
        payAmountFen: 1234,
        receiverAddress: '北京市朝阳区测试地址一号'
      }],
      paymentRows: [{ _id: 'payment-1', outTradeNo: 'W1' }],
      adminRows: [{ _id: 'admin-1', openId: 'admin-openid', enabled: true, newOrderNoticeEnabled: true }],
      orderUpdate,
      paymentUpdate
    });
    const api = loadNotifyWithDb(db);

    try {
      await expect(api.main({ outTradeNo: 'W1', transactionId: 'tx-1' })).resolves.toEqual({
        errcode: 0,
        errmsg: 'ok'
      });
      expect(orderUpdate).toHaveBeenCalledOnce();
      expect(paymentUpdate).toHaveBeenCalledOnce();
    } finally {
      process.env.NEW_ORDER_TEMPLATE_ID = originalTemplateId;
    }
  });

  it('skips new order notices when template id is missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const originalTemplateId = process.env.NEW_ORDER_TEMPLATE_ID;
    delete process.env.NEW_ORDER_TEMPLATE_ID;
    const orderUpdate = vi.fn(async () => ({}));
    const paymentUpdate = vi.fn(async () => ({}));
    const send = vi.fn(async () => ({}));
    const db = createNotifyDb({
      orderRows: [{
        _id: 'order-1',
        orderNo: 'W1',
        payStatus: 'not_paid',
        payAmountFen: 1234,
        receiverAddress: '北京市朝阳区测试地址一号'
      }],
      paymentRows: [{ _id: 'payment-1', outTradeNo: 'W1' }],
      adminRows: [{ _id: 'admin-1', openId: 'admin-openid', enabled: true, newOrderNoticeEnabled: true }],
      orderUpdate,
      paymentUpdate
    });
    const api = loadNotifyWithDb(db, {
      openapi: { subscribeMessage: { send } }
    });

    try {
      await expect(api.main({ outTradeNo: 'W1', transactionId: 'tx-1' })).resolves.toEqual({
        errcode: 0,
        errmsg: 'ok'
      });
      expect(orderUpdate).toHaveBeenCalledOnce();
      expect(paymentUpdate).toHaveBeenCalledOnce();
      expect(send).not.toHaveBeenCalled();
    } finally {
      process.env.NEW_ORDER_TEMPLATE_ID = originalTemplateId;
    }
  });
});

function loadNotifyWithDb(db, cloudOverrides = {}) {
  const cloud = {
    DYNAMIC_CURRENT_ENV: 'dynamic-current-env',
    init: vi.fn(),
    database: vi.fn(() => db),
    ...cloudOverrides
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

function createNotifyDb({ orderRows, paymentRows, adminRows = [], orderUpdate, paymentUpdate }) {
  const orderQuery = createQuery(orderRows);
  const paymentQuery = createQuery(paymentRows);
  const adminQuery = createQuery(adminRows);
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
      if (name === 'admins') {
        return {
          where: vi.fn(() => adminQuery)
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
