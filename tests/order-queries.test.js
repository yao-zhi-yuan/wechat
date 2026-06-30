import { describe, expect, it, vi } from 'vitest';
import orderQueriesModule from '../cloudfunctions/api/lib/orderQueries.js';

const { getMyOrder, listMyOrders } = orderQueriesModule;

describe('order query cloud actions', () => {
  it('returns only the current user order by id', async () => {
    const order = { _id: 'order-1', userOpenId: 'openid-1' };
    const db = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({ data: order }))
        }))
      }))
    };

    await expect(getMyOrder({ orderId: 'order-1' }, { db, openId: 'openid-1' })).resolves.toEqual({
      ok: true,
      data: order
    });
  });

  it('rejects orders owned by another user', async () => {
    const db = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({ data: { _id: 'order-1', userOpenId: 'other-openid' } }))
        }))
      }))
    };

    await expect(getMyOrder({ orderId: 'order-1' }, { db, openId: 'openid-1' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: '订单不存在'
    });
  });

  it('lists current user orders newest first', async () => {
    const orders = [{ _id: 'order-2' }, { _id: 'order-1' }];
    const query = {
      where: vi.fn(() => query),
      orderBy: vi.fn(() => query),
      limit: vi.fn(() => query),
      get: vi.fn(async () => ({ data: orders }))
    };
    const db = {
      collection: vi.fn(() => query)
    };

    await expect(listMyOrders({}, { db, openId: 'openid-1' })).resolves.toEqual({
      ok: true,
      data: { orders }
    });
    expect(query.where).toHaveBeenCalledWith({ userOpenId: 'openid-1' });
    expect(query.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(query.limit).toHaveBeenCalledWith(50);
  });
});
