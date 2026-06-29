import { describe, expect, it } from 'vitest';
import responseModule from '../cloudfunctions/api/lib/response.js';

const { ok, fail } = responseModule;

describe('cloud response helper', () => {
  it('wraps successful data', () => {
    expect(ok({ id: 'o1' })).toEqual({ ok: true, data: { id: 'o1' } });
  });

  it('wraps errors without stack traces', () => {
    expect(fail('BAD_REQUEST', '请求参数错误')).toEqual({
      ok: false,
      error: { code: 'BAD_REQUEST', message: '请求参数错误' }
    });
  });
});
