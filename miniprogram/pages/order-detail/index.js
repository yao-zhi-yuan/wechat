import { callApi } from '../../services/api';
import { formatFen } from '../../utils/money';
import { orderStatusLabel } from '../../utils/status';

Page({
  data: {
    orderId: '',
    order: null,
    items: [],
    statusText: '',
    amountText: '',
    loading: true,
    error: ''
  },

  async onLoad(query = {}) {
    this.setData({ orderId: query.id || '' });
    await this.loadOrder(query.id);
  },

  async onPullDownRefresh() {
    try {
      await this.loadOrder(this.data.orderId);
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  async loadOrder(orderId) {
    if (!orderId) {
      this.setData({ loading: false, error: '订单不存在' });
      return;
    }

    this.setData({ loading: true, error: '' });
    try {
      const order = await callApi('getMyOrder', { orderId });
      this.setData({
        order,
        items: (order.items || []).map((item) => ({
          ...item,
          priceText: formatFen(item.priceFen),
          subtotalText: formatFen(item.subtotalFen)
        })),
        statusText: orderStatusLabel(order.status),
        amountText: formatFen(order.payAmountFen),
        loading: false,
        error: ''
      });
    } catch (error) {
      this.setData({
        loading: false,
        error: error && error.message ? error.message : '订单加载失败'
      });
    }
  }
});
