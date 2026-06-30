import { afterEach, describe, expect, it, vi } from 'vitest';
import paymentsModule from '../cloudfunctions/api/lib/payments.js';

const { createPayment } = paymentsModule;

const originalEnv = {
  WX_CLOUD_ENV_ID: process.env.WX_CLOUD_ENV_ID,
  WX_PAY_SUB_MCH_ID: process.env.WX_PAY_SUB_MCH_ID
};

afterEach(() => {
  restoreEnv('WX_CLOUD_ENV_ID', originalEnv.WX_CLOUD_ENV_ID);
  restoreEnv('WX_PAY_SUB_MCH_ID', originalEnv.WX_PAY_SUB_MCH_ID);
  vi.restoreAllMocks();
});

describe('payment cloud actions', () => {
  it('creates a payment record and unified order', async () => {
    process.env.WX_CLOUD_ENV_ID = 'env-test';
    process.env.WX_PAY_SUB_MCH_ID = 'mch-test';
    const order = {
      _id: 'order-1',
      userOpenId: 'openid-1',
      orderNo: 'W2026062900000001',
      payAmountFen: 3600,
      status: 'pending_payment'
    };
    const paymentCollection = { add: vi.fn(async () => ({ _id: 'payment-1' })) };
    const db = createPaymentDb(order, paymentCollection);
    const cloud = {
      cloudPay: {
        unifiedOrder: vi.fn(async () => ({ payment: { timeStamp: '1', nonceStr: 'n' } }))
      }
    };

    await expect(createPayment({ orderId: 'order-1' }, { db, cloud, openId: 'openid-1' })).resolves.toEqual({
      ok: true,
      data: { orderId: 'order-1', payment: { timeStamp: '1', nonceStr: 'n' } }
    });
    expect(paymentCollection.add).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order-1',
        orderNo: 'W2026062900000001',
        outTradeNo: 'W2026062900000001',
        amountFen: 3600,
        status: 'created'
      })
    });
    expect(cloud.cloudPay.unifiedOrder).toHaveBeenCalledWith({
      body: '水饮到家-W2026062900000001',
      outTradeNo: 'W2026062900000001',
      spbillCreateIp: '127.0.0.1',
      subMchId: 'mch-test',
      totalFee: 3600,
      envId: 'env-test',
      functionName: 'payNotify',
      tradeType: 'JSAPI'
    });
  });

  it('rejects orders that do not belong to the current user', async () => {
    const db = createPaymentDb({ _id: 'order-1', userOpenId: 'other-openid', status: 'pending_payment' });

    await expect(createPayment({ orderId: 'order-1' }, { db, cloud: {}, openId: 'openid-1' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: '订单不存在'
    });
  });

  it('rejects missing order ids as missing orders', async () => {
    const db = { collection: vi.fn() };

    await expect(createPayment({}, { db, cloud: {}, openId: 'openid-1' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: '订单不存在'
    });
    expect(db.collection).not.toHaveBeenCalled();
  });

  it('rejects orders that are not pending payment', async () => {
    const db = createPaymentDb({ _id: 'order-1', userOpenId: 'openid-1', status: 'paid_waiting_delivery' });

    await expect(createPayment({ orderId: 'order-1' }, { db, cloud: {}, openId: 'openid-1' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: '订单状态不可支付'
    });
  });

  it('rejects missing payment configuration before creating a payment row', async () => {
    delete process.env.WX_CLOUD_ENV_ID;
    delete process.env.WX_PAY_SUB_MCH_ID;
    const paymentCollection = { add: vi.fn() };
    const db = createPaymentDb({
      _id: 'order-1',
      userOpenId: 'openid-1',
      orderNo: 'W2026062900000001',
      payAmountFen: 3600,
      status: 'pending_payment'
    }, paymentCollection);

    await expect(createPayment({ orderId: 'order-1' }, { db, cloud: {}, openId: 'openid-1' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: '支付配置未完成'
    });
    expect(paymentCollection.add).not.toHaveBeenCalled();
  });
});

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function createPaymentDb(order, paymentCollection = { add: vi.fn() }) {
  return {
    collection: vi.fn((name) => {
      if (name === 'orders') {
        return {
          doc: vi.fn(() => ({
            get: vi.fn(async () => ({ data: order }))
          }))
        };
      }
      if (name === 'payments') {
        return paymentCollection;
      }
      throw new Error(`unexpected collection: ${name}`);
    })
  };
}
