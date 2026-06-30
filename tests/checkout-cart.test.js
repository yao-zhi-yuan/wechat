import { describe, expect, it, vi } from 'vitest';
import { cartToItems, parseCheckoutCart } from '../miniprogram/pages/checkout/cart.js';

describe('checkout cart helpers', () => {
  it('parses URL cart payloads into valid cart entries', () => {
    const cart = { p1: 2, p2: 0, p3: '3', p4: 100, '': 1 };

    expect(parseCheckoutCart({ cart: encodeURIComponent(JSON.stringify(cart)) })).toEqual({ p1: 2 });
  });

  it('returns an empty cart for malformed URL cart payloads', () => {
    expect(parseCheckoutCart({ cart: '%7Bbad-json' })).toEqual({});
    expect(parseCheckoutCart({ cart: encodeURIComponent(JSON.stringify(null)) })).toEqual({});
    expect(parseCheckoutCart({ cart: encodeURIComponent(JSON.stringify('p1')) })).toEqual({});
  });

  it('reads storage handoff carts and removes the storage key', () => {
    const storage = {
      getStorageSync: vi.fn(() => ({ p1: 2 })),
      removeStorageSync: vi.fn()
    };

    expect(parseCheckoutCart({ cartStorageKey: 'checkoutCart' }, storage)).toEqual({ p1: 2 });
    expect(storage.getStorageSync).toHaveBeenCalledWith('checkoutCart');
    expect(storage.removeStorageSync).toHaveBeenCalledWith('checkoutCart');
  });

  it('removes malformed storage handoff carts', () => {
    const storage = {
      getStorageSync: vi.fn(() => 'bad-cart'),
      removeStorageSync: vi.fn()
    };

    expect(parseCheckoutCart({ cartStorageKey: 'checkoutCart' }, storage)).toEqual({});
    expect(storage.removeStorageSync).toHaveBeenCalledWith('checkoutCart');
  });

  it('converts cart objects to createOrder items', () => {
    expect(cartToItems({ p1: 2, p2: 1 })).toEqual([
      { productId: 'p1', quantity: 2 },
      { productId: 'p2', quantity: 1 }
    ]);
  });
});
