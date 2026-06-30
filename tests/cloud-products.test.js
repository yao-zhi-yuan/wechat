import { describe, expect, it, vi } from 'vitest';
import productsModule from '../cloudfunctions/api/lib/products.js';

const { listProducts } = productsModule;

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
