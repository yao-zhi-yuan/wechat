export function createEmptyProductForm() {
  return {
    _id: '',
    name: '',
    categoryId: '',
    spec: '',
    description: '',
    imageUrl: '',
    priceYuan: '',
    status: 'on_sale',
    sortOrder: '100'
  };
}

export function productToForm(product) {
  return {
    ...createEmptyProductForm(),
    _id: product._id || '',
    name: product.name || '',
    categoryId: product.categoryId || '',
    spec: product.spec || '',
    description: product.description || '',
    imageUrl: Array.isArray(product.images) ? product.images[0] || '' : '',
    priceYuan: Number.isInteger(product.priceFen) ? (product.priceFen / 100).toFixed(2) : '',
    status: product.status === 'off_sale' ? 'off_sale' : 'on_sale',
    sortOrder: String(Number.isFinite(product.sortOrder) ? product.sortOrder : 100)
  };
}

export function formToSaveProductPayload(form) {
  const name = trim(form.name);
  if (!name) {
    throw new Error('请输入商品名称');
  }

  const priceFen = parseYuanToFen(form.priceYuan);
  if (!Number.isInteger(priceFen) || priceFen <= 0) {
    throw new Error('请输入正确价格');
  }

  const imageUrl = trim(form.imageUrl);
  const sortOrder = Number(trim(form.sortOrder) || 100);
  const payload = {
    name,
    categoryId: trim(form.categoryId),
    spec: trim(form.spec),
    description: trim(form.description),
    images: imageUrl ? [imageUrl] : [],
    priceFen,
    status: form.status === 'off_sale' ? 'off_sale' : 'on_sale',
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100
  };
  const id = trim(form._id);
  if (id) {
    payload._id = id;
  }
  return payload;
}

function parseYuanToFen(value) {
  const text = trim(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return NaN;
  }
  const [yuan, cent = ''] = text.split('.');
  return Number(yuan) * 100 + Number(cent.padEnd(2, '0'));
}

function trim(value) {
  return typeof value === 'string' ? value.trim() : '';
}
