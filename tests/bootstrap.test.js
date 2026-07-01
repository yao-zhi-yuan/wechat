import { describe, expect, it, vi } from 'vitest';
import bootstrapModule from '../cloudfunctions/api/lib/bootstrap.js';

const { BOOTSTRAP_CONFIRMATION, bootstrapInitialData } = bootstrapModule;

describe('bootstrap cloud action', () => {
  it('creates required collections and seeds initial catalogue data', async () => {
    const { db, writes } = createBootstrapDb();

    await expect(bootstrapInitialData({
      confirm: BOOTSTRAP_CONFIRMATION
    }, { db })).resolves.toMatchObject({
      ok: true,
      data: {
        collections: expect.arrayContaining(['shop_config', 'categories', 'products', 'orders'])
      }
    });

    expect(db.createCollection).toHaveBeenCalledWith('shop_config');
    expect(db.createCollection).toHaveBeenCalledWith('categories');
    expect(db.createCollection).toHaveBeenCalledWith('products');
    expect(db.createCollection).toHaveBeenCalledWith('orders');
    expect(writes['shop_config/default']).toEqual(expect.objectContaining({
      shopName: '水饮到家',
      deliveryFeeEnabled: false
    }));
    expect(writes['categories/water']).toEqual(expect.objectContaining({
      name: '饮用水',
      status: 'enabled'
    }));
    expect(writes['products/nongfu-barrel']).toEqual(expect.objectContaining({
      name: '农夫山泉桶装水',
      categoryId: 'water',
      status: 'on_sale'
    }));
  });

  it('does not overwrite existing documents', async () => {
    const { db, writes } = createBootstrapDb({
      'shop_config/default': { shopName: '已有店铺' }
    });

    await bootstrapInitialData({ confirm: BOOTSTRAP_CONFIRMATION }, { db });

    expect(writes['shop_config/default']).toBeUndefined();
    expect(writes['categories/water']).toEqual(expect.objectContaining({
      name: '饮用水'
    }));
  });
});

function createBootstrapDb(existingDocs = {}) {
  const writes = {};
  const db = {
    createCollection: vi.fn(async () => ({ ok: true })),
    collection: vi.fn((collectionName) => ({
      doc: vi.fn((docId) => ({
        get: vi.fn(async () => {
          const key = `${collectionName}/${docId}`;
          if (Object.prototype.hasOwnProperty.call(existingDocs, key)) {
            return { data: existingDocs[key] };
          }
          const error = new Error('document not found');
          error.errCode = -502004;
          throw error;
        }),
        set: vi.fn(async ({ data }) => {
          writes[`${collectionName}/${docId}`] = data;
          return { stats: { created: 1 } };
        })
      }))
    }))
  };
  return { db, writes };
}
