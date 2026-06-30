import { callApi } from '../../../services/api';
import { buildAdminProductViewModels } from './viewModels';

Page({
  data: {
    products: [],
    loading: true,
    error: ''
  },

  async onShow() {
    await this.loadProducts();
  },

  async onPullDownRefresh() {
    try {
      await this.loadProducts();
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  async loadProducts() {
    this.setData({ loading: true, error: '' });
    try {
      const data = await callApi('adminListProducts');
      this.setData({
        products: buildAdminProductViewModels(data.products || []),
        loading: false,
        error: ''
      });
    } catch (error) {
      this.setData({
        loading: false,
        error: error && error.message ? error.message : '商品加载失败'
      });
    }
  },

  createProduct() {
    wx.navigateTo({ url: '/pages/admin/product-edit/index' });
  },

  editProduct(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/admin/product-edit/index?id=${id}` });
  }
});
