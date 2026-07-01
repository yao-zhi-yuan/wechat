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
  },

  async enableNotice() {
    try {
      const shop = await callApi('getShopConfig');
      const templateId = shop.templateIds && shop.templateIds.newOrder;
      if (!templateId) {
        wx.showToast({ title: '新订单提醒未配置', icon: 'none' });
        return;
      }
      const result = await wx.requestSubscribeMessage({ tmplIds: [templateId] });
      if (!result || result[templateId] !== 'accept') {
        wx.showToast({ title: '未获得提醒权限', icon: 'none' });
        return;
      }
      await callApi('enableAdminNewOrderNotice');
      wx.showToast({ title: '已开启提醒' });
    } catch (error) {
      wx.showToast({ title: '开启失败', icon: 'none' });
    }
  }
});
