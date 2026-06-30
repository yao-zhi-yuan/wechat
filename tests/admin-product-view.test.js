import { describe, expect, it } from 'vitest';
import { buildAdminProductViewModels } from '../miniprogram/pages/admin/products/viewModels.js';

describe('admin product list view models', () => {
  it('adds price and status text for merchant product rows', () => {
    expect(buildAdminProductViewModels([
      { _id: 'p1', name: '农夫山泉桶装水', priceFen: 2500, status: 'on_sale', sortOrder: 20 },
      { _id: 'p2', name: '可口可乐', priceFen: 320, status: 'off_sale', sortOrder: 30 }
    ])).toEqual([
      { _id: 'p1', name: '农夫山泉桶装水', priceFen: 2500, status: 'on_sale', sortOrder: 20, priceText: '¥25.00', statusText: '上架中' },
      { _id: 'p2', name: '可口可乐', priceFen: 320, status: 'off_sale', sortOrder: 30, priceText: '¥3.20', statusText: '已下架' }
    ]);
  });
});
