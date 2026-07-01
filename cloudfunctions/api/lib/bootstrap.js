const { COLLECTIONS } = require('./db');
const { validationError } = require('./errors');
const { ok } = require('./response');

const BOOTSTRAP_CONFIRMATION = 'INIT_WATER_SHOP';

const REQUIRED_COLLECTIONS = [
  COLLECTIONS.shopConfig,
  COLLECTIONS.categories,
  COLLECTIONS.products,
  COLLECTIONS.orders,
  COLLECTIONS.payments,
  COLLECTIONS.refunds,
  COLLECTIONS.users,
  COLLECTIONS.admins
];

async function bootstrapInitialData(data, ctx) {
  if (!data || data.confirm !== BOOTSTRAP_CONFIRMATION) {
    throw validationError('初始化确认短语不正确');
  }
  if (!ctx.db || typeof ctx.db.createCollection !== 'function') {
    throw validationError('当前云数据库 SDK 不支持创建集合');
  }

  const collections = [];
  for (const collectionName of REQUIRED_COLLECTIONS) {
    const created = await ensureCollection(ctx.db, collectionName);
    if (created) {
      collections.push(collectionName);
    }
  }

  const now = new Date();
  const seededDocs = [];
  for (const seed of buildSeedDocuments(now)) {
    const seeded = await ensureDocument(ctx.db, seed.collection, seed.id, seed.data);
    if (seeded) {
      seededDocs.push(`${seed.collection}/${seed.id}`);
    }
  }

  return ok({ collections, seededDocs });
}

async function ensureCollection(db, collectionName) {
  try {
    await db.createCollection(collectionName);
    return true;
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      return false;
    }
    throw error;
  }
}

async function ensureDocument(db, collectionName, id, data) {
  const doc = db.collection(collectionName).doc(id);
  try {
    const result = await doc.get();
    if (result && result.data) {
      return false;
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  await doc.set({ data });
  return true;
}

function buildSeedDocuments(now) {
  return [
    {
      collection: COLLECTIONS.shopConfig,
      id: 'default',
      data: {
        shopName: '水饮到家',
        announcement: '下单后由商家同城配送',
        servicePhone: '13800138000',
        deliveryDescription: '微信群覆盖区域内免配送费',
        deliveryFeeEnabled: false,
        deliveryFeeFen: 0,
        deliveryAreaEnabled: false,
        deliveryAreaDescription: '当前仅服务微信群覆盖区域',
        businessHours: '08:00-20:00',
        templateIds: {
          newOrder: ''
        },
        updatedAt: now
      }
    },
    {
      collection: COLLECTIONS.categories,
      id: 'water',
      data: { name: '饮用水', sortOrder: 10, status: 'enabled' }
    },
    {
      collection: COLLECTIONS.categories,
      id: 'drinks',
      data: { name: '饮料', sortOrder: 20, status: 'enabled' }
    },
    {
      collection: COLLECTIONS.categories,
      id: 'daily',
      data: { name: '日用品', sortOrder: 30, status: 'enabled' }
    },
    {
      collection: COLLECTIONS.products,
      id: 'nongfu-barrel',
      data: {
        name: '农夫山泉桶装水',
        categoryId: 'water',
        images: [],
        spec: '19L/桶',
        description: '桶装饮用水',
        priceFen: 1800,
        status: 'on_sale',
        sortOrder: 10,
        stockEnabled: false,
        stock: null,
        createdAt: now,
        updatedAt: now
      }
    },
    {
      collection: COLLECTIONS.products,
      id: 'nongfu-box',
      data: {
        name: '农夫山泉箱装水',
        categoryId: 'water',
        images: [],
        spec: '550ml*24瓶',
        description: '箱装饮用水',
        priceFen: 3600,
        status: 'on_sale',
        sortOrder: 20,
        stockEnabled: false,
        stock: null,
        createdAt: now,
        updatedAt: now
      }
    },
    {
      collection: COLLECTIONS.products,
      id: 'coke-box',
      data: {
        name: '可口可乐',
        categoryId: 'drinks',
        images: [],
        spec: '330ml*24罐',
        description: '箱装饮料',
        priceFen: 5200,
        status: 'on_sale',
        sortOrder: 30,
        stockEnabled: false,
        stock: null,
        createdAt: now,
        updatedAt: now
      }
    }
  ];
}

function isAlreadyExistsError(error) {
  const message = getErrorText(error);
  return message.includes('already exists')
    || message.includes('already exist')
    || message.includes('collection exists')
    || message.includes('collection already');
}

function isNotFoundError(error) {
  const message = getErrorText(error);
  return error && (error.errCode === -502004 || error.code === 'DATABASE_DOCUMENT_NOT_EXIST')
    || message.includes('document not exist')
    || message.includes('document not found')
    || message.includes('not found');
}

function getErrorText(error) {
  if (!error) {
    return '';
  }
  return `${error.errMsg || ''} ${error.message || ''} ${error.code || ''}`.toLowerCase();
}

module.exports = {
  BOOTSTRAP_CONFIRMATION,
  bootstrapInitialData
};
