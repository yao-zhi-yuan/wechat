import { describe, expect, it } from 'vitest';
import {
  createEmptyProductForm,
  formToSaveProductPayload,
  productToForm
} from '../miniprogram/pages/admin/product-edit/form.js';

describe('admin product form helpers', () => {
  it('creates default form values for a new product', () => {
    expect(createEmptyProductForm()).toEqual({
      _id: '',
      name: '',
      categoryId: '',
      spec: '',
      description: '',
      imageUrl: '',
      priceYuan: '',
      status: 'on_sale',
      sortOrder: '100'
    });
  });

  it('maps an existing product into editable form values', () => {
    expect(productToForm({
      _id: 'p1',
      name: '农夫山泉桶装水',
      categoryId: 'water',
      images: ['cloud://image-1'],
      spec: '19L',
      description: '桶装水',
      priceFen: 2500,
      status: 'off_sale',
      sortOrder: 20
    })).toEqual({
      _id: 'p1',
      name: '农夫山泉桶装水',
      categoryId: 'water',
      spec: '19L',
      description: '桶装水',
      imageUrl: 'cloud://image-1',
      priceYuan: '25.00',
      status: 'off_sale',
      sortOrder: '20'
    });
  });

  it('converts form values into the save product payload', () => {
    expect(formToSaveProductPayload({
      _id: 'p1',
      name: ' 可口可乐 ',
      categoryId: ' drinks ',
      spec: ' 330ml ',
      description: ' 箱装饮料 ',
      imageUrl: ' cloud://image-2 ',
      priceYuan: '3.20',
      status: 'off_sale',
      sortOrder: '30'
    })).toEqual({
      _id: 'p1',
      name: '可口可乐',
      categoryId: 'drinks',
      spec: '330ml',
      description: '箱装饮料',
      images: ['cloud://image-2'],
      priceFen: 320,
      status: 'off_sale',
      sortOrder: 30
    });
  });
});
