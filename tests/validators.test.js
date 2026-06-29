import { describe, expect, it } from 'vitest';
import { isValidPhone, normalizeQuantity, validateReceiver } from '../miniprogram/utils/validators.js';

describe('validators', () => {
  it('validates mainland mobile phone numbers', () => {
    expect(isValidPhone('13800138000')).toBe(true);
    expect(isValidPhone('123')).toBe(false);
  });

  it('normalizes quantity between 1 and 99', () => {
    expect(normalizeQuantity('3')).toBe(3);
    expect(normalizeQuantity('0')).toBe(1);
    expect(normalizeQuantity('200')).toBe(99);
  });

  it('requires receiver fields', () => {
    expect(validateReceiver({ name: '张三', phone: '13800138000', address: '朝阳区测试地址1号' }).valid).toBe(true);
  });
});
