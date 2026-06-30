import { describe, expect, it } from 'vitest';
import { buildOrderListViewModels } from '../miniprogram/pages/orders/viewModels.js';

describe('order list view models', () => {
  it('adds status and amount text for orders', () => {
    expect(buildOrderListViewModels([
      { _id: 'order-1', status: 'paid_waiting_delivery', payAmountFen: 3600 }
    ])).toEqual([
      { _id: 'order-1', status: 'paid_waiting_delivery', payAmountFen: 3600, statusText: '已支付/待配送', amountText: '¥36.00' }
    ]);
  });
});
