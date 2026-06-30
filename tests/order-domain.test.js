import { describe, expect, it, vi } from 'vitest';
import ordersModule from '../cloudfunctions/api/lib/orders.js';

const { buildOrderItems, createOrder, createOrderNo } = ordersModule;

describe('order domain', () => {
  it('copies product snapshots and computes subtotals', () => {
    const products = [{ _id: 'p1', name: '水', spec: '19L', images: ['a'], priceFen: 1800, status: 'on_sale' }];

    const items = buildOrderItems([{ productId: 'p1', quantity: 2 }], products);

    expect(items[0]).toMatchObject({
      productId: 'p1',
      name: '水',
      priceFen: 1800,
      quantity: 2,
      subtotalFen: 3600
    });
  });

  it('creates merchant order numbers with W prefix', () => {
    expect(createOrderNo('openid123', new Date('2026-06-29T10:00:00Z'))).toMatch(/^W20260629\d{8}$/);
  });

  it('creates distinct order numbers within the same millisecond', () => {
    const now = new Date('2026-06-29T10:00:00Z');

    expect(createOrderNo('openid123', now)).not.toBe(createOrderNo('openid123', now));
  });

  it('rejects products that are not on sale', () => {
    const products = [{ _id: 'p1', name: '水', spec: '19L', images: [], priceFen: 1800, status: 'draft' }];

    expect(() => buildOrderItems([{ productId: 'p1', quantity: 1 }], products)).toThrow('商品已下架');
  });

  it('marks order validation failures as application errors', () => {
    const products = [{ _id: 'p1', name: '水', spec: '19L', images: [], priceFen: 1800, status: 'on_sale' }];

    try {
      buildOrderItems([{ productId: 'p1', quantity: 0 }], products);
      throw new Error('expected buildOrderItems to throw');
    } catch (error) {
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('商品数量不正确');
    }
  });

  it('rejects corrupt product prices', () => {
    const products = [{ _id: 'p1', name: '水', spec: '19L', images: [], priceFen: '1800', status: 'on_sale' }];

    expect(() => buildOrderItems([{ productId: 'p1', quantity: 1 }], products)).toThrow('商品价格不正确');
  });

  it('creates a pending order record with computed amounts', async () => {
    const productRows = [{ _id: 'p1', name: '水', spec: '19L', images: ['a'], priceFen: 1800, status: 'on_sale' }];
    const productQuery = {
      where: vi.fn(() => productQuery),
      get: vi.fn(async () => ({ data: productRows }))
    };
    const ordersCollection = {
      add: vi.fn(async () => ({ _id: 'order-1' }))
    };
    const db = {
      command: {
        in: vi.fn((ids) => ({ $in: ids }))
      },
      collection: vi.fn((name) => {
        if (name === 'products') return productQuery;
        if (name === 'orders') return ordersCollection;
        throw new Error(`unexpected collection: ${name}`);
      })
    };

    const result = await createOrder({
      items: [{ productId: 'p1', quantity: 2 }],
      receiverName: '张三',
      receiverPhone: '13800138000',
      receiverAddress: '测试地址',
      remark: '放门口'
    }, { db, openId: 'openid-1' });

    expect(result).toMatchObject({
      ok: true,
      data: { orderId: 'order-1', payAmountFen: 3600 }
    });
    const order = ordersCollection.add.mock.calls[0][0].data;
    expect(order).toMatchObject({
      userOpenId: 'openid-1',
      goodsAmountFen: 3600,
      deliveryFeeFen: 0,
      payAmountFen: 3600,
      receiverName: '张三',
      receiverPhone: '13800138000',
      receiverAddress: '测试地址',
      remark: '放门口',
      status: 'pending_payment',
      payStatus: 'not_paid',
      deliveryStatus: 'not_started',
      refundStatus: 'none',
      wechatShippingUploadStatus: 'pending'
    });
    expect(order.items[0]).toMatchObject({ productId: 'p1', quantity: 2, subtotalFen: 3600 });
    expect(order.createdAt).toBeInstanceOf(Date);
    expect(order.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects invalid receiver data on the server', async () => {
    const { db } = createOrderDb([{ _id: 'p1', name: '水', spec: '19L', images: [], priceFen: 1800, status: 'on_sale' }]);

    await expect(createOrder({
      items: [{ productId: 'p1', quantity: 1 }],
      receiverName: '张三',
      receiverPhone: '123',
      receiverAddress: '测试地址'
    }, { db, openId: 'openid-1' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: '请填写正确手机号'
    });
  });
});

function createOrderDb(productRows) {
  const productQuery = {
    where: vi.fn(() => productQuery),
    get: vi.fn(async () => ({ data: productRows }))
  };
  const ordersCollection = {
    add: vi.fn(async () => ({ _id: 'order-1' }))
  };
  const db = {
    command: {
      in: vi.fn((ids) => ({ $in: ids }))
    },
    collection: vi.fn((name) => {
      if (name === 'products') return productQuery;
      if (name === 'orders') return ordersCollection;
      throw new Error(`unexpected collection: ${name}`);
    })
  };
  return { db, ordersCollection, productQuery };
}
