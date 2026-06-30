import { afterEach, describe, expect, it, vi } from 'vitest';
import shippingModule from '../cloudfunctions/api/lib/shipping.js';

const { uploadShippingInfo } = shippingModule;
const originalMchId = process.env.WX_PAY_SUB_MCH_ID;

afterEach(() => {
  if (originalMchId === undefined) {
    delete process.env.WX_PAY_SUB_MCH_ID;
  } else {
    process.env.WX_PAY_SUB_MCH_ID = originalMchId;
  }
  vi.restoreAllMocks();
});

describe('wechat order shipping upload', () => {
  it('uploads real-goods delivery payload for an order', async () => {
    process.env.WX_PAY_SUB_MCH_ID = 'mch-1';
    const upload = vi.fn(async () => ({ errCode: 0 }));
    const ctx = {
      cloud: {
        openapi: {
          orderShipping: {
            uploadShippingInfo: upload
          }
        }
      }
    };

    await expect(uploadShippingInfo({
      orderNo: 'W202606300001',
      userOpenId: 'openid-1',
      receiverPhone: '13800138000',
      items: [
        { name: '农夫山泉桶装水', quantity: 2 },
        { name: '可口可乐', quantity: 1 }
      ]
    }, ctx)).resolves.toEqual({ errCode: 0 });

    expect(upload).toHaveBeenCalledWith(expect.objectContaining({
      order_key: {
        order_number_type: 2,
        mchid: 'mch-1',
        out_trade_no: 'W202606300001'
      },
      logistics_type: 3,
      delivery_mode: 1,
      shipping_list: [{
        item_desc: '农夫山泉桶装水x2，可口可乐x1',
        contact: {
          receiver_contact: '13800138000'
        }
      }],
      payer: {
        openid: 'openid-1'
      }
    }));
    expect(upload.mock.calls[0][0].upload_time).toEqual(expect.any(String));
  });
});
