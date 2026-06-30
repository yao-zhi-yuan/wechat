import { describe, expect, it, vi } from 'vitest';
import { requestOrderPayment } from '../miniprogram/pages/checkout/payment.js';

describe('checkout payment helper', () => {
  it('resolves when wx.requestPayment succeeds', async () => {
    const wxApi = {
      requestPayment: vi.fn((params) => params.success({ errMsg: 'requestPayment:ok' }))
    };

    await expect(requestOrderPayment(wxApi, { timeStamp: '1' })).resolves.toEqual({
      errMsg: 'requestPayment:ok'
    });
    expect(wxApi.requestPayment).toHaveBeenCalledWith(expect.objectContaining({ timeStamp: '1' }));
  });

  it('rejects when wx.requestPayment fails', async () => {
    const wxApi = {
      requestPayment: vi.fn((params) => params.fail(new Error('cancel')))
    };

    await expect(requestOrderPayment(wxApi, { timeStamp: '1' })).rejects.toThrow('cancel');
  });
});
