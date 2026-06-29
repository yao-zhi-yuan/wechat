import { describe, expect, it } from 'vitest';
import { formatFen, multiplyPrice, sumOrderItems } from '../miniprogram/utils/money.js';

describe('money utilities', () => {
  it('formats cents as yuan text', () => {
    expect(formatFen(1234)).toBe('¥12.34');
  });

  it('multiplies price by quantity in cents', () => {
    expect(multiplyPrice(250, 3)).toBe(750);
  });

  it('sums order items without floating point math', () => {
    expect(sumOrderItems([{ priceFen: 1200, quantity: 2 }, { priceFen: 350, quantity: 1 }])).toBe(2750);
  });
});
