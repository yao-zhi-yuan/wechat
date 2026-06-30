const { COLLECTIONS } = require('./db');
const { requireAdmin } = require('./admins');
const { validationError } = require('./errors');
const { ok } = require('./response');

const CATALOGUE_PAGE_SIZE = 100;

async function listProducts(data, ctx) {
  const [categories, products] = await Promise.all([
    fetchAll(() => ctx.db.collection(COLLECTIONS.categories).where({ status: 'enabled' }).orderBy('sortOrder', 'asc')),
    fetchAll(() => ctx.db.collection(COLLECTIONS.products).where({ status: 'on_sale' }).orderBy('sortOrder', 'asc'))
  ]);
  return ok({ categories, products });
}

async function adminListProducts(data, ctx) {
  await requireAdmin(ctx);
  const products = await fetchAll(() => ctx.db.collection(COLLECTIONS.products).orderBy('sortOrder', 'asc'));
  return ok({ products });
}

async function saveProduct(data, ctx) {
  await requireAdmin(ctx);
  const now = new Date();
  const product = normalizeProduct(data, now);
  if (data._id) {
    await ctx.db.collection(COLLECTIONS.products).doc(data._id).update({ data: product });
    return ok({ productId: data._id });
  }

  const result = await ctx.db.collection(COLLECTIONS.products).add({
    data: {
      ...product,
      createdAt: now
    }
  });
  return ok({ productId: result._id });
}

function normalizeProduct(data, now) {
  const name = trimString(data.name);
  if (!name) {
    throw validationError('商品名称不能为空');
  }

  const priceFen = Number(data.priceFen);
  if (!Number.isInteger(priceFen) || priceFen <= 0) {
    throw validationError('商品价格不正确');
  }

  const sortOrder = Number(data.sortOrder || 100);
  return {
    name,
    categoryId: trimString(data.categoryId),
    images: Array.isArray(data.images) ? data.images.filter(Boolean) : [],
    spec: trimString(data.spec),
    description: trimString(data.description),
    priceFen,
    status: data.status === 'off_sale' ? 'off_sale' : 'on_sale',
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
    stockEnabled: false,
    stock: null,
    updatedAt: now
  };
}

function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function fetchAll(createQuery) {
  const rows = [];
  let offset = 0;
  while (true) {
    const result = await createQuery().skip(offset).limit(CATALOGUE_PAGE_SIZE).get();
    const pageRows = result.data || [];
    rows.push(...pageRows);
    if (pageRows.length < CATALOGUE_PAGE_SIZE) {
      return rows;
    }
    offset += CATALOGUE_PAGE_SIZE;
  }
}

module.exports = { adminListProducts, listProducts, saveProduct };
