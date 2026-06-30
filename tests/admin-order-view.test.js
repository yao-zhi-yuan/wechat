import { describe, expect, it } from 'vitest';
import { buildAdminOrderViewModels } from '../miniprogram/pages/admin/orders/viewModels.js';
import { buildAdminOrderDetailViewModel } from '../miniprogram/pages/admin/order-detail/viewModel.js';

describe('admin order view models', () => {
  it('adds list display fields for merchant order rows', () => {
    expect(buildAdminOrderViewModels([
      {
        _id: 'order-1',
        orderNo: 'W1',
        status: 'paid_waiting_delivery',
        payAmountFen: 3600,
        receiverName: '张三',
        receiverPhone: '13800138000',
        wechatShippingUploadStatus: 'pending'
      }
    ])).toEqual([
      {
        _id: 'order-1',
        orderNo: 'W1',
        status: 'paid_waiting_delivery',
        payAmountFen: 3600,
        receiverName: '张三',
        receiverPhone: '13800138000',
        wechatShippingUploadStatus: 'pending',
        amountText: '¥36.00',
        statusText: '已支付/待配送',
        receiverText: '张三 13800138000',
        shippingStatusText: '待同步'
      }
    ]);
  });

  it('adds detail display fields and action flags', () => {
    expect(buildAdminOrderDetailViewModel({
      _id: 'order-1',
      status: 'paid_waiting_delivery',
      payAmountFen: 3600,
      wechatShippingUploadStatus: 'failed',
      items: [
        { name: '农夫山泉桶装水', quantity: 2, priceFen: 1800, subtotalFen: 3600 }
      ]
    })).toMatchObject({
      amountText: '¥36.00',
      statusText: '已支付/待配送',
      shippingStatusText: '同步失败',
      shippingHelpText: '发货信息同步失败，请在微信小程序后台手工补录发货信息。',
      canStartDelivery: true,
      canComplete: false,
      items: [{
        name: '农夫山泉桶装水',
        quantity: 2,
        priceText: '¥18.00',
        subtotalText: '¥36.00'
      }]
    });
  });
});
