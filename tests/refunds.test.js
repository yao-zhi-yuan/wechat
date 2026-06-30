import { afterEach, describe, expect, it, vi } from 'vitest';
import refundsModule from '../cloudfunctions/api/lib/refunds.js';

const { requestRefund } = refundsModule;
const originalEnv = {
  WX_CLOUD_ENV_ID: process.env.WX_CLOUD_ENV_ID,
  WX_PAY_SUB_MCH_ID: process.env.WX_PAY_SUB_MCH_ID
};

afterEach(() => {
  restoreEnv('WX_CLOUD_ENV_ID', originalEnv.WX_CLOUD_ENV_ID);
  restoreEnv('WX_PAY_SUB_MCH_ID', originalEnv.WX_PAY_SUB_MCH_ID);
  vi.restoreAllMocks();
});

describe('refund cloud actions', () => {
  it('creates a refund record, calls CloudPay refund, and marks order refunding', async () => {
    process.env.WX_CLOUD_ENV_ID = 'env-test';
    process.env.WX_PAY_SUB_MCH_ID = 'mch-test';
    const order = createPaidOrder();
    const refundCollection = { add: vi.fn(async () => ({ _id: 'refund-1' })) };
    const orderDoc = createOrderDoc(order);
    const db = createRefundDb({
      admins: [{ _id: 'admin-1' }],
      orderDoc,
      refundCollection
    });
    const cloud = {
      cloudPay: {
        refund: vi.fn(async () => ({ returnCode: 'SUCCESS' }))
      }
    };

    await expect(requestRefund({
      orderId: 'order-1',
      reason: '客户取消'
    }, { db, cloud, openId: 'admin-openid' })).resolves.toEqual({
      ok: true,
      data: { outRefundNo: 'RW202606300001' }
    });
    expect(refundCollection.add).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order-1',
        orderNo: 'W202606300001',
        outRefundNo: 'RW202606300001',
        amountFen: 3600,
        reason: '客户取消',
        status: 'processing',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
    });
    expect(cloud.cloudPay.refund).toHaveBeenCalledWith({
      outTradeNo: 'W202606300001',
      outRefundNo: 'RW202606300001',
      totalFee: 3600,
      refundFee: 3600,
      subMchId: 'mch-test',
      envId: 'env-test',
      functionName: 'refundNotify'
    });
    expect(orderDoc.update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'refunding',
        refundStatus: 'processing',
        updatedAt: expect.any(Date)
      })
    });
  });

  it('rejects non-refundable orders', async () => {
    const db = createRefundDb({
      admins: [{ _id: 'admin-1' }],
      orderDoc: createOrderDoc({ ...createPaidOrder(), refundStatus: 'processing' }),
      refundCollection: { add: vi.fn() }
    });

    await expect(requestRefund({ orderId: 'order-1' }, { db, cloud: {}, openId: 'admin-openid' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: '订单不可退款'
    });
  });

  it('rejects missing refund configuration before creating a refund row', async () => {
    delete process.env.WX_CLOUD_ENV_ID;
    delete process.env.WX_PAY_SUB_MCH_ID;
    const refundCollection = { add: vi.fn() };
    const db = createRefundDb({
      admins: [{ _id: 'admin-1' }],
      orderDoc: createOrderDoc(createPaidOrder()),
      refundCollection
    });

    await expect(requestRefund({ orderId: 'order-1' }, { db, cloud: {}, openId: 'admin-openid' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: '退款配置未完成'
    });
    expect(refundCollection.add).not.toHaveBeenCalled();
  });
});

function createPaidOrder() {
  return {
    _id: 'order-1',
    orderNo: 'W202606300001',
    payAmountFen: 3600,
    payStatus: 'paid',
    refundStatus: 'none'
  };
}

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function createAdminCollection(data) {
  const collection = {
    where: vi.fn(() => collection),
    limit: vi.fn(() => collection),
    get: vi.fn(async () => ({ data }))
  };
  return collection;
}

function createOrderDoc(data) {
  return {
    get: vi.fn(async () => ({ data })),
    update: vi.fn(async () => ({ stats: { updated: 1 } }))
  };
}

function createRefundDb({ admins, orderDoc, refundCollection }) {
  return {
    collection: vi.fn((name) => {
      if (name === 'admins') {
        return createAdminCollection(admins);
      }
      if (name === 'orders') {
        return {
          doc: vi.fn(() => orderDoc)
        };
      }
      if (name === 'refunds') {
        return refundCollection;
      }
      throw new Error(`unexpected collection: ${name}`);
    })
  };
}
