import { callApi } from '../../../services/api';
import { buildAdminOrderDetailViewModel } from './viewModel';

Page({
  data: {
    orderId: '',
    order: null,
    items: [],
    loading: true,
    operating: false,
    error: ''
  },

  async onLoad(query = {}) {
    const orderId = query.id || '';
    this.setData({ orderId });
    await this.loadOrder(orderId);
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
      const data = await callApi('adminListOrders');
      const order = (data.orders || []).find((item) => item._id === orderId);
      if (!order) {
        this.setData({ loading: false, error: '订单不存在' });
        return;
      }
      const viewModel = buildAdminOrderDetailViewModel(order);
      this.setData({
        order: viewModel,
        items: viewModel.items,
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

  async startDelivery() {
    await this.runOrderAction('startDelivery', '已开始配送');
  },

  async completeOrder() {
    await this.runOrderAction('completeOrder', '订单已完成');
  },

  requestRefund() {
    if (!this.data.order || !this.data.order.canRefund) return;
    wx.showModal({
      title: '确认退款',
      content: '将按订单实付金额原路退款',
      success: async (result) => {
        if (result.confirm) {
          await this.runOrderAction('requestRefund', '已申请退款', { reason: '商家退款' });
        }
      }
    });
  },

  async runOrderAction(action, successTitle, extraData = {}) {
    if (this.data.operating || !this.data.orderId) return;
    this.setData({ operating: true, error: '' });
    try {
      await callApi(action, { orderId: this.data.orderId, ...extraData });
      wx.showToast({ title: successTitle, icon: 'success' });
      await this.loadOrder(this.data.orderId);
    } catch (error) {
      const message = error && error.message ? error.message : '操作失败';
      this.setData({ error: message });
      wx.showToast({ title: message, icon: 'none' });
    } finally {
      this.setData({ operating: false });
    }
  }
});
