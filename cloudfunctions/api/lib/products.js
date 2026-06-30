const { COLLECTIONS } = require('./db');
const { ok } = require('./response');

const CATALOGUE_PAGE_SIZE = 100;

async function listProducts(data, ctx) {
  const [categories, products] = await Promise.all([
    fetchAll(() => ctx.db.collection(COLLECTIONS.categories).where({ status: 'enabled' }).orderBy('sortOrder', 'asc')),
    fetchAll(() => ctx.db.collection(COLLECTIONS.products).where({ status: 'on_sale' }).orderBy('sortOrder', 'asc'))
  ]);
  return ok({ categories, products });
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

module.exports = { listProducts };
