import { callApi } from '../../../services/api';

Page({
  data: {
    loading: true,
    error: '',
    productCount: 0
  },

  async onShow() {
    await this.loadDashboard();
  },

  async loadDashboard() {
    this.setData({ loading: true, error: '' });
    try {
      const data = await callApi('adminListProducts');
      this.setData({
        productCount: (data.products || []).length,
        loading: false,
        error: ''
      });
    } catch (error) {
      this.setData({
        loading: false,
        error: error && error.message ? error.message : '加载失败'
      });
    }
  },

  goProducts() {
    wx.navigateTo({ url: '/pages/admin/products/index' });
  },

  goOrders() {
    wx.navigateTo({ url: '/pages/admin/orders/index' });
  }
});
