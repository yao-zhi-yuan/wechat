import { callApi } from '../../services/api';
import { buildOrderListViewModels } from './viewModels';

Page({
  data: {
    orders: [],
    loading: true,
    error: ''
  },

  async onShow() {
    await this.loadOrders();
  },

  async onPullDownRefresh() {
    try {
      await this.loadOrders();
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  async loadOrders() {
    this.setData({ loading: true, error: '' });
    try {
      const data = await callApi('listMyOrders');
      this.setData({
        orders: buildOrderListViewModels(data.orders || []),
        loading: false,
        error: ''
      });
    } catch (error) {
      this.setData({
        loading: false,
        error: error && error.message ? error.message : '订单加载失败'
      });
    }
  },

  openOrder(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/order-detail/index?id=${id}` });
  }
});
