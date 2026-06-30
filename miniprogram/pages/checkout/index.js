import { callApi } from '../../services/api';
import { validateReceiver } from '../../utils/validators';
import { cartToItems, parseCheckoutCart } from './cart';
import { requestOrderPayment } from './payment';

Page({
  data: {
    items: [],
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    remark: '',
    submitting: false,
    error: ''
  },

  onLoad(query = {}) {
    const cart = parseCheckoutCart(query, wx);
    this.setData({ items: cartToItems(cart) });
  },

  updateField(event) {
    this.setData({ [event.currentTarget.dataset.field]: event.detail.value });
  },

  async submitOrder() {
    if (this.data.submitting || !this.data.items.length) {
      return;
    }

    const receiver = {
      name: this.data.receiverName,
      phone: this.data.receiverPhone,
      address: this.data.receiverAddress
    };
    const validation = validateReceiver(receiver);
    if (!validation.valid) {
      wx.showToast({ title: validation.message, icon: 'none' });
      return;
    }

    this.setData({ submitting: true, error: '' });
    try {
      const order = await callApi('createOrder', {
        items: this.data.items,
        receiverName: receiver.name,
        receiverPhone: receiver.phone,
        receiverAddress: receiver.address,
        remark: this.data.remark
      });
      const pay = await callApi('createPayment', { orderId: order.orderId });
      await requestOrderPayment(wx, pay.payment);
      wx.redirectTo({ url: `/pages/order-detail/index?id=${order.orderId}` });
    } catch (error) {
      const message = error && error.message ? error.message : '提交失败';
      this.setData({ error: message });
      wx.showToast({ title: message, icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
