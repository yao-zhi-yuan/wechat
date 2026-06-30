import { describe, expect, it, vi } from 'vitest';
import productsModule from '../cloudfunctions/api/lib/products.js';

const { adminListProducts, listProducts, saveProduct } = productsModule;

describe('product cloud actions', () => {
  it('returns enabled categories and on-sale products', async () => {
    const categories = [{ _id: 'water', name: '饮用水' }];
    const products = [{ _id: 'p1', name: '农夫山泉桶装水' }];
    const categoryCollection = createCollectionResult(categories);
    const productCollection = createCollectionResult(products);
    const db = {
      collection: vi.fn((name) => {
        if (name === 'categories') {
          return categoryCollection;
        }
        if (name === 'products') {
          return productCollection;
        }
        throw new Error(`unexpected collection: ${name}`);
      })
    };

    await expect(listProducts({}, { db })).resolves.toEqual({
      ok: true,
      data: { categories, products }
    });
    expect(categoryCollection.where).toHaveBeenCalledWith({ status: 'enabled' });
    expect(categoryCollection.orderBy).toHaveBeenCalledWith('sortOrder', 'asc');
    expect(productCollection.where).toHaveBeenCalledWith({ status: 'on_sale' });
    expect(productCollection.orderBy).toHaveBeenCalledWith('sortOrder', 'asc');
  });

  it('fetches all catalogue pages', async () => {
    const categories = Array.from({ length: 101 }, (_, index) => ({ _id: `c${index}` }));
    const products = Array.from({ length: 101 }, (_, index) => ({ _id: `p${index}` }));
    const categoryCollection = createPaginatedCollectionResult(categories);
    const productCollection = createPaginatedCollectionResult(products);
    const db = {
      collection: vi.fn((name) => {
        if (name === 'categories') {
          return categoryCollection;
        }
        if (name === 'products') {
          return productCollection;
        }
        throw new Error(`unexpected collection: ${name}`);
      })
    };

    await expect(listProducts({}, { db })).resolves.toEqual({
      ok: true,
      data: { categories, products }
    });
    expect(categoryCollection.skip).toHaveBeenCalledWith(0);
    expect(categoryCollection.skip).toHaveBeenCalledWith(100);
    expect(productCollection.skip).toHaveBeenCalledWith(0);
    expect(productCollection.skip).toHaveBeenCalledWith(100);
  });

  it('lists all products for admins', async () => {
    const products = [
      { _id: 'p1', name: '农夫山泉桶装水', status: 'on_sale' },
      { _id: 'p2', name: '可口可乐', status: 'off_sale' }
    ];
    const adminCollection = createAdminCollection([{ _id: 'admin-1' }]);
    const productCollection = createCollectionResult(products);
    const db = createAdminProductDb(adminCollection, productCollection);

    await expect(adminListProducts({}, { db, openId: 'openid-admin' })).resolves.toEqual({
      ok: true,
      data: { products }
    });
    expect(adminCollection.where).toHaveBeenCalledWith({ openId: 'openid-admin', enabled: true });
    expect(productCollection.orderBy).toHaveBeenCalledWith('sortOrder', 'asc');
  });

  it('rejects admin product listing for non-admins', async () => {
    const adminCollection = createAdminCollection([]);
    const db = createAdminProductDb(adminCollection, createCollectionResult([]));

    await expect(adminListProducts({}, { db, openId: 'openid-user' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: '需要管理员权限'
    });
  });

  it('adds normalized products for admins', async () => {
    const adminCollection = createAdminCollection([{ _id: 'admin-1' }]);
    const productCollection = createProductWriteCollection();
    const db = createAdminProductDb(adminCollection, productCollection);

    await expect(saveProduct({
      name: ' 农夫山泉桶装水 ',
      categoryId: 'water',
      images: ['cloud://image-1'],
      spec: '19L',
      description: '桶装水',
      priceFen: '2500',
      status: 'off_sale',
      sortOrder: '20'
    }, { db, openId: 'openid-admin' })).resolves.toEqual({
      ok: true,
      data: { productId: 'new-product-id' }
    });
    expect(productCollection.add).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: '农夫山泉桶装水',
        categoryId: 'water',
        images: ['cloud://image-1'],
        spec: '19L',
        description: '桶装水',
        priceFen: 2500,
        status: 'off_sale',
        sortOrder: 20,
        stockEnabled: false,
        stock: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
    });
  });

  it('updates existing products for admins', async () => {
    const adminCollection = createAdminCollection([{ _id: 'admin-1' }]);
    const productCollection = createProductWriteCollection();
    const db = createAdminProductDb(adminCollection, productCollection);

    await expect(saveProduct({
      _id: 'p1',
      name: '可口可乐',
      categoryId: 'drinks',
      priceFen: 320,
      status: 'on_sale'
    }, { db, openId: 'openid-admin' })).resolves.toEqual({
      ok: true,
      data: { productId: 'p1' }
    });
    expect(productCollection.doc).toHaveBeenCalledWith('p1');
    expect(productCollection.update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: '可口可乐',
        priceFen: 320,
        status: 'on_sale',
        updatedAt: expect.any(Date)
      })
    });
  });

  it('rejects invalid product data', async () => {
    const adminCollection = createAdminCollection([{ _id: 'admin-1' }]);
    const db = createAdminProductDb(adminCollection, createProductWriteCollection());

    await expect(saveProduct({
      name: '',
      categoryId: 'water',
      priceFen: 0
    }, { db, openId: 'openid-admin' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: '商品名称不能为空'
    });
  });
});

function createCollectionResult(data) {
  const collection = {
    where: vi.fn(() => collection),
    orderBy: vi.fn(() => collection),
    skip: vi.fn(() => collection),
    limit: vi.fn(() => collection),
    get: vi.fn(async () => ({ data }))
  };
  return collection;
}

function createPaginatedCollectionResult(data) {
  const collection = {
    offset: 0,
    pageSize: data.length,
    where: vi.fn(() => collection),
    orderBy: vi.fn(() => collection),
    skip: vi.fn((offset) => {
      collection.offset = offset;
      return collection;
    }),
    limit: vi.fn((pageSize) => {
      collection.pageSize = pageSize;
      return collection;
    }),
    get: vi.fn(async () => ({
      data: data.slice(collection.offset, collection.offset + collection.pageSize)
    }))
  };
  return collection;
}

function createAdminCollection(data) {
  const collection = {
    where: vi.fn(() => collection),
    limit: vi.fn(() => collection),
    get: vi.fn(async () => ({ data }))
  };
  return collection;
}

function createProductWriteCollection() {
  const collection = {
    add: vi.fn(async () => ({ _id: 'new-product-id' })),
    doc: vi.fn(() => collection),
    update: vi.fn(async () => ({ stats: { updated: 1 } }))
  };
  return collection;
}

function createAdminProductDb(adminCollection, productCollection) {
  return {
    collection: vi.fn((name) => {
      if (name === 'admins') {
        return adminCollection;
      }
      if (name === 'products') {
        return productCollection;
      }
      throw new Error(`unexpected collection: ${name}`);
    })
  };
}
