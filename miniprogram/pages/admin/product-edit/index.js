import { callApi } from '../../../services/api';
import {
  createEmptyProductForm,
  formToSaveProductPayload,
  productToForm
} from './form';

Page({
  data: {
    id: '',
    form: createEmptyProductForm(),
    isOnSale: true,
    loading: false,
    saving: false,
    error: '',
    loadFailed: false
  },

  async onLoad(query = {}) {
    const id = query.id || '';
    this.setData({ id });
    if (id) {
      await this.loadProduct(id);
    }
  },

  async loadProduct(id) {
    this.setData({ loading: true, error: '', loadFailed: false });
    try {
      const data = await callApi('adminListProducts');
      const product = (data.products || []).find((item) => item._id === id);
      if (!product) {
        this.setData({ loading: false, error: '商品不存在', loadFailed: true });
        return;
      }
      this.setForm(productToForm(product));
      this.setData({ loading: false, error: '', loadFailed: false });
    } catch (error) {
      this.setData({
        loading: false,
        error: error && error.message ? error.message : '商品加载失败',
        loadFailed: true
      });
    }
  },

  updateField(event) {
    const field = event.currentTarget.dataset.field;
    if (!field) return;
    this.setData({ [`form.${field}`]: event.detail.value });
  },

  toggleStatus(event) {
    const status = event.detail.value ? 'on_sale' : 'off_sale';
    this.setData({
      'form.status': status,
      isOnSale: status === 'on_sale'
    });
  },

  async saveProduct() {
    if (this.data.saving) return;
    let payload;
    try {
      payload = formToSaveProductPayload(this.data.form);
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
      return;
    }

    this.setData({ saving: true, error: '' });
    try {
      await callApi('saveProduct', payload);
      wx.showToast({ title: '已保存', icon: 'success' });
      wx.navigateBack();
    } catch (error) {
      const message = error && error.message ? error.message : '保存失败';
      this.setData({ error: message });
      wx.showToast({ title: message, icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  setForm(form) {
    this.setData({
      form,
      isOnSale: form.status === 'on_sale'
    });
  }
});
