import { describe, expect, it, vi } from 'vitest';
import { buildCheckoutCartUrl, pruneCartForProducts } from '../miniprogram/pages/shop/cart.js';

describe('shop cart helpers', () => {
  it('removes cart entries for products no longer in the catalogue', () => {
    expect(pruneCartForProducts({ p1: 2, p2: 1 }, [{ _id: 'p2' }])).toEqual({ p2: 1 });
  });

  it('uses the query cart payload when the checkout URL is short', () => {
    const storage = { setStorageSync: vi.fn() };

    expect(buildCheckoutCartUrl({ p1: 2 }, { storage, maxUrlLength: 200 })).toBe(
      `/pages/checkout/index?cart=${encodeURIComponent(JSON.stringify({ p1: 2 }))}`
    );
    expect(storage.setStorageSync).not.toHaveBeenCalled();
  });

  it('uses storage when the checkout cart URL would be too long', () => {
    const storage = { setStorageSync: vi.fn() };
    const cart = { product_with_long_identifier: 12 };

    expect(buildCheckoutCartUrl(cart, { storage, maxUrlLength: 20 })).toBe(
      '/pages/checkout/index?cartStorageKey=checkoutCart'
    );
    expect(storage.setStorageSync).toHaveBeenCalledWith('checkoutCart', cart);
  });
});
