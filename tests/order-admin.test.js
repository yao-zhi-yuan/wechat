import { describe, expect, it, vi } from 'vitest';
import ordersModule from '../cloudfunctions/api/lib/orders.js';

const { adminListOrders, completeOrder, startDelivery } = ordersModule;

describe('admin order actions', () => {
  it('lists orders newest first for admins', async () => {
    const orders = [{ _id: 'order-2' }, { _id: 'order-1' }];
    const adminCollection = createAdminCollection([{ _id: 'admin-1' }]);
    const ordersCollection = createOrderListCollection(orders);
    const db = createAdminOrderDb(adminCollection, ordersCollection);

    await expect(adminListOrders({ status: 'paid_waiting_delivery' }, { db, openId: 'admin-openid' })).resolves.toEqual({
      ok: true,
      data: { orders }
    });
    expect(adminCollection.where).toHaveBeenCalledWith({ openId: 'admin-openid', enabled: true });
    expect(ordersCollection.where).toHaveBeenCalledWith({ status: 'paid_waiting_delivery' });
    expect(ordersCollection.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(ordersCollection.limit).toHaveBeenCalledWith(100);
  });

  it('rejects order listing for non-admins', async () => {
    const adminCollection = createAdminCollection([]);
    const db = createAdminOrderDb(adminCollection, createOrderListCollection([]));

    await expect(adminListOrders({}, { db, openId: 'user-openid' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: '需要管理员权限'
    });
  });

  it('starts delivery and marks shipping upload success', async () => {
    const order = createPaidOrder();
    const adminCollection = createAdminCollection([{ _id: 'admin-1' }]);
    const orderDoc = createOrderDoc(order);
    const db = createAdminOrderDb(adminCollection, createOrderCollectionWithDoc(orderDoc));
    const uploadShippingInfo = vi.fn(async () => ({ errCode: 0 }));

    await expect(startDelivery({ orderId: 'order-1' }, {
      db,
      openId: 'admin-openid',
      uploadShippingInfo
    })).resolves.toEqual({
      ok: true,
      data: { orderId: 'order-1' }
    });
    expect(orderDoc.update.mock.calls[0][0].data).toMatchObject({
      status: 'delivering',
      deliveryStatus: 'delivering',
      wechatShippingUploadStatus: 'pending'
    });
    expect(uploadShippingInfo).toHaveBeenCalledWith(order, expect.any(Object));
    expect(orderDoc.update.mock.calls[1][0].data).toMatchObject({
      wechatShippingUploadStatus: 'uploaded'
    });
  });

  it('keeps delivery started when shipping upload fails', async () => {
    const adminCollection = createAdminCollection([{ _id: 'admin-1' }]);
    const orderDoc = createOrderDoc(createPaidOrder());
    const db = createAdminOrderDb(adminCollection, createOrderCollectionWithDoc(orderDoc));
    const uploadShippingInfo = vi.fn(async () => {
      throw new Error('upload unavailable');
    });

    await expect(startDelivery({ orderId: 'order-1' }, {
      db,
      openId: 'admin-openid',
      uploadShippingInfo
    })).resolves.toEqual({
      ok: true,
      data: { orderId: 'order-1' }
    });
    expect(orderDoc.update.mock.calls[1][0].data).toMatchObject({
      wechatShippingUploadStatus: 'failed',
      wechatShippingError: 'upload unavailable'
    });
  });

  it('rejects orders that are not ready for delivery', async () => {
    const adminCollection = createAdminCollection([{ _id: 'admin-1' }]);
    const orderDoc = createOrderDoc({ ...createPaidOrder(), status: 'pending_payment' });
    const db = createAdminOrderDb(adminCollection, createOrderCollectionWithDoc(orderDoc));

    await expect(startDelivery({ orderId: 'order-1' }, {
      db,
      openId: 'admin-openid',
      uploadShippingInfo: vi.fn()
    })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: '订单状态不可配送'
    });
  });

  it('completes delivering orders', async () => {
    const adminCollection = createAdminCollection([{ _id: 'admin-1' }]);
    const orderDoc = createOrderDoc({ ...createPaidOrder(), status: 'delivering' });
    const db = createAdminOrderDb(adminCollection, createOrderCollectionWithDoc(orderDoc));

    await expect(completeOrder({ orderId: 'order-1' }, { db, openId: 'admin-openid' })).resolves.toEqual({
      ok: true,
      data: { orderId: 'order-1' }
    });
    expect(orderDoc.update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'completed',
        deliveryStatus: 'completed',
        completedAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
    });
  });

  it('rejects completion before delivery starts', async () => {
    const adminCollection = createAdminCollection([{ _id: 'admin-1' }]);
    const orderDoc = createOrderDoc(createPaidOrder());
    const db = createAdminOrderDb(adminCollection, createOrderCollectionWithDoc(orderDoc));

    await expect(completeOrder({ orderId: 'order-1' }, { db, openId: 'admin-openid' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: '订单状态不可完成'
    });
  });
});

function createPaidOrder() {
  return {
    _id: 'order-1',
    orderNo: 'W202606300001',
    status: 'paid_waiting_delivery',
    userOpenId: 'openid-1',
    receiverPhone: '13800138000',
    items: [{ name: '农夫山泉桶装水', quantity: 2 }]
  };
}

function createAdminCollection(data) {
  const collection = {
    where: vi.fn(() => collection),
    limit: vi.fn(() => collection),
    get: vi.fn(async () => ({ data }))
  };
  return collection;
}

function createOrderListCollection(data) {
  const collection = {
    where: vi.fn(() => collection),
    orderBy: vi.fn(() => collection),
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

function createOrderCollectionWithDoc(doc) {
  return {
    doc: vi.fn(() => doc)
  };
}

function createAdminOrderDb(adminCollection, ordersCollection) {
  return {
    collection: vi.fn((name) => {
      if (name === 'admins') {
        return adminCollection;
      }
      if (name === 'orders') {
        return ordersCollection;
      }
      throw new Error(`unexpected collection: ${name}`);
    })
  };
}
