import { describe, expect, it } from 'vitest';
import { canTransitionOrder, orderStatusLabel } from '../miniprogram/utils/status.js';

describe('order status', () => {
  it('allows paid orders to enter delivery', () => {
    expect(canTransitionOrder('paid_waiting_delivery', 'delivering')).toBe(true);
  });

  it('blocks completed orders from refunding directly in status transition helper', () => {
    expect(canTransitionOrder('completed', 'refunding')).toBe(false);
  });

  it('returns customer-facing labels', () => {
    expect(orderStatusLabel('paid_waiting_delivery')).toBe('已支付/待配送');
  });
});
