# 微信小程序水饮店铺 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-store WeChat Mini Program for water and beverage delivery with official WeChat Pay, in-app merchant management, refunds, subscription notifications, and order shipping management.

**Architecture:** Use a native WeChat Mini Program frontend and WeChat Cloud Development backend. A routed `api` cloud function handles business actions, while dedicated notification functions handle payment/refund/platform callbacks; cloud database stores products, orders, payments, refunds, users, admins, and shop configuration.

**Tech Stack:** WeChat Mini Program native WXML/WXSS/JS, WeChat Cloud Development, Node.js cloud functions, Vitest for pure function tests, official WeChat Pay/CloudPay capabilities, WeChat order shipping APIs.

---

## File Structure

Use the current repository root as the project root.

- `project.config.json`: WeChat DevTools project configuration.
- `package.json`: local test and lint scripts.
- `miniprogram/app.js`: mini program bootstrapping and cloud init.
- `miniprogram/app.json`: page routing and window config.
- `miniprogram/app.wxss`: global styles.
- `miniprogram/utils/money.js`: cent-based money formatting and validation.
- `miniprogram/utils/status.js`: order status labels and transition rules.
- `miniprogram/utils/validators.js`: phone, address, quantity validation.
- `miniprogram/services/api.js`: wrapper around `wx.cloud.callFunction`.
- `miniprogram/pages/shop/*`: customer storefront.
- `miniprogram/pages/checkout/*`: checkout and payment launch.
- `miniprogram/pages/orders/*`: customer order list.
- `miniprogram/pages/order-detail/*`: customer order detail.
- `miniprogram/pages/admin/index/*`: admin dashboard.
- `miniprogram/pages/admin/products/*`: product management list.
- `miniprogram/pages/admin/product-edit/*`: product create/edit.
- `miniprogram/pages/admin/orders/*`: admin order list.
- `miniprogram/pages/admin/order-detail/*`: admin order detail, shipping, refund.
- `cloudfunctions/api/index.js`: routed backend API entry.
- `cloudfunctions/api/lib/*.js`: backend domain modules.
- `cloudfunctions/payNotify/index.js`: payment success callback handler.
- `cloudfunctions/refundNotify/index.js`: refund callback handler.
- `cloudfunctions/platformNotify/index.js`: order shipping/platform event handler.
- `scripts/seed-dev-data.mjs`: development seed data.
- `tests/*.test.js`: pure function and cloud-domain unit tests.
- `docs/deployment.md`: account, cloud, payment, shipping, and release checklist.

## Task 1: Project Skeleton

**Files:**
- Create: `package.json`
- Create: `project.config.json`
- Create: `.gitignore`
- Create: `miniprogram/app.js`
- Create: `miniprogram/app.json`
- Create: `miniprogram/app.wxss`
- Create: `miniprogram/sitemap.json`
- Create: minimal placeholder page files (`index.js`, `index.json`, `index.wxml`, `index.wxss`) for every route declared in `miniprogram/app.json`
- Create: minimal placeholder cloud function entries for `cloudfunctions/api/index.js`, `cloudfunctions/payNotify/index.js`, `cloudfunctions/refundNotify/index.js`, and `cloudfunctions/platformNotify/index.js`

- [ ] **Step 1: Write the initial package and project config**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "node --check cloudfunctions/api/index.js && node --check cloudfunctions/payNotify/index.js && node --check cloudfunctions/refundNotify/index.js && node --check cloudfunctions/platformNotify/index.js"
  },
  "devDependencies": {
    "vitest": "^3.2.0"
  }
}
```

```json
{
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/",
  "setting": {
    "urlCheck": true,
    "es6": true,
    "postcss": true,
    "minified": true
  },
  "appid": "touristappid",
  "projectname": "wechat"
}
```

- [ ] **Step 2: Create app shell files**

```js
App({
  globalData: {
    envId: '',
    userOpenId: ''
  },
  onLaunch() {
    wx.cloud.init({
      traceUser: true
    });
  }
});
```

```json
{
  "pages": [
    "pages/shop/index",
    "pages/checkout/index",
    "pages/orders/index",
    "pages/order-detail/index",
    "pages/admin/index/index",
    "pages/admin/products/index",
    "pages/admin/product-edit/index",
    "pages/admin/orders/index",
    "pages/admin/order-detail/index"
  ],
  "window": {
    "navigationBarTitleText": "水饮到家",
    "navigationBarBackgroundColor": "#ffffff",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#f6f8fb"
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json"
}
```

- [ ] **Step 3: Run the first local verification**

Run: `npm run lint`

Expected: PASS because placeholder cloud function entries exist.

Run: `npm test`

Expected: `No test files found` or a Vitest no-tests message before test files exist. Vitest 3 exits with code 1 for this no-test state; this is acceptable for Task 1 and will be resolved by Task 2 when tests are added.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json project.config.json .gitignore miniprogram cloudfunctions docs/superpowers/plans/2026-06-29-wechat-water-shop.md
git commit -m "chore: scaffold mini program project"
```

## Task 2: Shared Domain Utilities

**Files:**
- Create: `miniprogram/utils/money.js`
- Create: `miniprogram/utils/status.js`
- Create: `miniprogram/utils/validators.js`
- Create: `tests/money.test.js`
- Create: `tests/status.test.js`
- Create: `tests/validators.test.js`

- [ ] **Step 1: Write failing money tests**

```js
import { describe, expect, it } from 'vitest';
import { formatFen, multiplyPrice, sumOrderItems } from '../miniprogram/utils/money.js';

describe('money utilities', () => {
  it('formats cents as yuan text', () => {
    expect(formatFen(1234)).toBe('¥12.34');
  });

  it('multiplies price by quantity in cents', () => {
    expect(multiplyPrice(250, 3)).toBe(750);
  });

  it('sums order items without floating point math', () => {
    expect(sumOrderItems([{ priceFen: 1200, quantity: 2 }, { priceFen: 350, quantity: 1 }])).toBe(2750);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/money.test.js`

Expected: FAIL because `money.js` exports do not exist.

- [ ] **Step 3: Implement money utilities**

```js
export function formatFen(valueFen) {
  assertNonNegativeInteger(valueFen, 'valueFen');
  return `¥${(valueFen / 100).toFixed(2)}`;
}

export function multiplyPrice(priceFen, quantity) {
  assertNonNegativeInteger(priceFen, 'priceFen');
  assertPositiveInteger(quantity, 'quantity');
  return priceFen * quantity;
}

export function sumOrderItems(items) {
  return items.reduce((total, item) => total + multiplyPrice(item.priceFen, item.quantity), 0);
}

function assertNonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
}

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}
```

- [ ] **Step 4: Add status and validation tests**

```js
import { describe, expect, it } from 'vitest';
import { canTransitionOrder, orderStatusLabel } from '../miniprogram/utils/status.js';

describe('order status', () => {
  it('allows paid orders to enter delivery', () => {
    expect(canTransitionOrder('paid_waiting_delivery', 'delivering')).toBe(true);
  });

  it('blocks completed orders from refunding directly in status transition helper', () => {
    expect(canTransitionOrder('completed', 'refunding')).toBe(false);
  });

  it('returns customer-facing labels', () => {
    expect(orderStatusLabel('paid_waiting_delivery')).toBe('已支付/待配送');
  });
});
```

```js
import { describe, expect, it } from 'vitest';
import { isValidPhone, normalizeQuantity, validateReceiver } from '../miniprogram/utils/validators.js';

describe('validators', () => {
  it('validates mainland mobile phone numbers', () => {
    expect(isValidPhone('13800138000')).toBe(true);
    expect(isValidPhone('123')).toBe(false);
  });

  it('normalizes quantity between 1 and 99', () => {
    expect(normalizeQuantity('3')).toBe(3);
    expect(normalizeQuantity('0')).toBe(1);
    expect(normalizeQuantity('200')).toBe(99);
  });

  it('requires receiver fields', () => {
    expect(validateReceiver({ name: '张三', phone: '13800138000', address: '朝阳区测试地址1号' }).valid).toBe(true);
  });
});
```

- [ ] **Step 5: Implement status and validators**

```js
const LABELS = {
  pending_payment: '待支付',
  paid_waiting_delivery: '已支付/待配送',
  delivering: '配送中',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款'
};

const TRANSITIONS = {
  pending_payment: ['paid_waiting_delivery', 'cancelled'],
  paid_waiting_delivery: ['delivering', 'refunding'],
  delivering: ['completed', 'refunding'],
  completed: [],
  cancelled: [],
  refunding: ['refunded'],
  refunded: []
};

export function orderStatusLabel(status) {
  return LABELS[status] || status;
}

export function canTransitionOrder(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}
```

```js
export function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || ''));
}

export function normalizeQuantity(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  if (parsed > 99) return 99;
  return parsed;
}

export function validateReceiver(receiver) {
  if (!receiver || !String(receiver.name || '').trim()) return { valid: false, message: '请填写收货人' };
  if (!isValidPhone(receiver.phone)) return { valid: false, message: '请填写正确手机号' };
  if (!String(receiver.address || '').trim()) return { valid: false, message: '请填写收货地址' };
  return { valid: true };
}
```

- [ ] **Step 6: Run tests and commit**

Run: `npm test`

Expected: PASS for `money`, `status`, and `validators`.

```bash
git add miniprogram/utils tests
git commit -m "feat: add shared order utilities"
```

## Task 3: Cloud API Router and Database Helpers

**Files:**
- Create: `cloudfunctions/api/package.json`
- Create: `cloudfunctions/api/index.js`
- Create: `cloudfunctions/api/lib/context.js`
- Create: `cloudfunctions/api/lib/response.js`
- Create: `cloudfunctions/api/lib/db.js`
- Create: `tests/cloud-response.test.js`

- [ ] **Step 1: Write response helper tests**

```js
import { describe, expect, it } from 'vitest';
import responseModule from '../cloudfunctions/api/lib/response.js';

const { ok, fail } = responseModule;

describe('cloud response helper', () => {
  it('wraps successful data', () => {
    expect(ok({ id: 'o1' })).toEqual({ ok: true, data: { id: 'o1' } });
  });

  it('wraps errors without stack traces', () => {
    expect(fail('BAD_REQUEST', '请求参数错误')).toEqual({ ok: false, error: { code: 'BAD_REQUEST', message: '请求参数错误' } });
  });
});
```

- [ ] **Step 2: Run response test and verify failure**

Run: `npm test -- tests/cloud-response.test.js`

Expected: FAIL because `response.js` does not exist.

- [ ] **Step 3: Implement API skeleton**

```js
const cloud = require('wx-server-sdk');
const { createContext } = require('./lib/context');
const { fail } = require('./lib/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const actions = {
  ping: async () => ({ ok: true, data: { pong: true } })
};

exports.main = async (event) => {
  const action = event && event.action;
  if (!action || !actions[action]) {
    return fail('UNKNOWN_ACTION', '未知操作');
  }
  const ctx = createContext(cloud, event);
  try {
    return await actions[action](event.data || {}, ctx);
  } catch (error) {
    console.error('[api]', action, error);
    return fail('INTERNAL_ERROR', '服务暂时不可用');
  }
};
```

```js
function createContext(cloud, event) {
  const wxContext = cloud.getWXContext();
  return {
    cloud,
    db: cloud.database(),
    openId: wxContext.OPENID,
    appId: wxContext.APPID,
    rawEvent: event
  };
}

module.exports = { createContext };
```

```js
function ok(data = {}) {
  return { ok: true, data };
}

function fail(code, message) {
  return { ok: false, error: { code, message } };
}

module.exports = { ok, fail };
```

```js
const COLLECTIONS = {
  products: 'products',
  categories: 'categories',
  orders: 'orders',
  payments: 'payments',
  refunds: 'refunds',
  users: 'users',
  admins: 'admins',
  shopConfig: 'shop_config'
};

module.exports = { COLLECTIONS };
```

- [ ] **Step 4: Run tests and syntax checks**

Run: `npm test -- tests/cloud-response.test.js && npm run lint`

Expected: PASS and no syntax errors.

- [ ] **Step 5: Commit**

```bash
git add cloudfunctions/api tests/cloud-response.test.js
git commit -m "feat: add cloud api router"
```

## Task 4: Seed Data and Collections

**Files:**
- Create: `scripts/seed-dev-data.mjs`
- Create: `cloudfunctions/api/lib/admins.js`
- Create: `cloudfunctions/api/lib/shop.js`
- Modify: `cloudfunctions/api/index.js`
- Create: `docs/deployment.md`

- [ ] **Step 1: Add dev seed script**

```js
export const seedData = {
  shop_config: [{
    _id: 'default',
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
    updatedAt: new Date()
  }],
  categories: [
    { _id: 'water', name: '饮用水', sortOrder: 10, status: 'enabled' },
    { _id: 'drinks', name: '饮料', sortOrder: 20, status: 'enabled' },
    { _id: 'daily', name: '日用品', sortOrder: 30, status: 'enabled' }
  ],
  products: [
    { name: '农夫山泉桶装水', categoryId: 'water', images: [], spec: '19L/桶', description: '桶装饮用水', priceFen: 1800, status: 'on_sale', sortOrder: 10, stockEnabled: false, stock: null },
    { name: '农夫山泉箱装水', categoryId: 'water', images: [], spec: '550ml*24瓶', description: '箱装饮用水', priceFen: 3600, status: 'on_sale', sortOrder: 20, stockEnabled: false, stock: null },
    { name: '可口可乐', categoryId: 'drinks', images: [], spec: '330ml*24罐', description: '箱装饮料', priceFen: 5200, status: 'on_sale', sortOrder: 30, stockEnabled: false, stock: null }
  ]
};

console.log(JSON.stringify(seedData, null, 2));
```

- [ ] **Step 2: Add shop API actions**

```js
const { COLLECTIONS } = require('./db');
const { ok } = require('./response');

async function getShopConfig(data, ctx) {
  const result = await ctx.db.collection(COLLECTIONS.shopConfig).doc('default').get();
  return ok(result.data);
}

async function getSession(data, ctx) {
  return ok({
    openId: ctx.openId,
    appId: ctx.appId
  });
}

module.exports = { getShopConfig, getSession };
```

```js
const { COLLECTIONS } = require('./db');

async function isAdmin(ctx) {
  const result = await ctx.db.collection(COLLECTIONS.admins)
    .where({ openId: ctx.openId, enabled: true })
    .limit(1)
    .get();
  return result.data.length > 0;
}

async function requireAdmin(ctx) {
  if (!(await isAdmin(ctx))) {
    const error = new Error('需要管理员权限');
    error.code = 'FORBIDDEN';
    throw error;
  }
}

module.exports = { isAdmin, requireAdmin };
```

- [ ] **Step 3: Register `getShopConfig` and `getSession` actions**

```js
const { getShopConfig, getSession } = require('./lib/shop');

const actions = {
  ping: async () => ({ ok: true, data: { pong: true } }),
  getShopConfig,
  getSession
};
```

- [ ] **Step 4: Document collection creation**

```md
# Deployment

Create these cloud database collections before first release:

- `shop_config`
- `categories`
- `products`
- `orders`
- `payments`
- `refunds`
- `users`
- `admins`

Set `admins.openId` from the merchant administrator's WeChat OpenID after running the `getSession` action in development.
```

- [ ] **Step 5: Verify and commit**

Run: `node scripts/seed-dev-data.mjs && npm run lint`

Expected: seed JSON printed and syntax checks pass.

```bash
git add scripts cloudfunctions/api docs/deployment.md
git commit -m "feat: add seed data and shop config api"
```

## Task 5: Product Catalogue API and Storefront

**Files:**
- Create: `cloudfunctions/api/lib/products.js`
- Modify: `cloudfunctions/api/index.js`
- Create: `miniprogram/services/api.js`
- Create: `miniprogram/pages/shop/index.js`
- Create: `miniprogram/pages/shop/index.json`
- Create: `miniprogram/pages/shop/index.wxml`
- Create: `miniprogram/pages/shop/index.wxss`

- [ ] **Step 1: Implement product list cloud action**

```js
const { COLLECTIONS } = require('./db');
const { ok } = require('./response');

async function listProducts(data, ctx) {
  const [categories, products] = await Promise.all([
    ctx.db.collection(COLLECTIONS.categories).where({ status: 'enabled' }).orderBy('sortOrder', 'asc').get(),
    ctx.db.collection(COLLECTIONS.products).where({ status: 'on_sale' }).orderBy('sortOrder', 'asc').get()
  ]);
  return ok({ categories: categories.data, products: products.data });
}

module.exports = { listProducts };
```

- [ ] **Step 2: Register `listProducts`**

```js
const { listProducts } = require('./lib/products');

const actions = {
  ping: async () => ({ ok: true, data: { pong: true } }),
  getShopConfig,
  getSession,
  listProducts
};
```

- [ ] **Step 3: Add frontend API wrapper**

```js
export async function callApi(action, data = {}) {
  const result = await wx.cloud.callFunction({
    name: 'api',
    data: { action, data }
  });
  const payload = result.result;
  if (!payload || !payload.ok) {
    const message = payload && payload.error ? payload.error.message : '服务暂时不可用';
    throw new Error(message);
  }
  return payload.data;
}
```

- [ ] **Step 4: Build storefront page**

```js
import { callApi } from '../../services/api';
import { formatFen } from '../../utils/money';

Page({
  data: {
    shop: null,
    categories: [],
    products: [],
    cart: {},
    loading: true
  },
  async onLoad() {
    await this.loadData();
  },
  async onPullDownRefresh() {
    await this.loadData();
    wx.stopPullDownRefresh();
  },
  async loadData() {
    this.setData({ loading: true });
    const [shop, catalogue] = await Promise.all([
      callApi('getShopConfig'),
      callApi('listProducts')
    ]);
    this.setData({ shop, categories: catalogue.categories, products: catalogue.products, loading: false });
  },
  formatPrice(event) {
    return formatFen(event);
  },
  addToCart(event) {
    const id = event.currentTarget.dataset.id;
    const cart = { ...this.data.cart };
    cart[id] = (cart[id] || 0) + 1;
    this.setData({ cart });
  },
  goCheckout() {
    wx.navigateTo({ url: `/pages/checkout/index?cart=${encodeURIComponent(JSON.stringify(this.data.cart))}` });
  },
  onShareAppMessage() {
    return {
      title: this.data.shop ? this.data.shop.shopName : '水饮到家',
      path: '/pages/shop/index'
    };
  }
});
```

- [ ] **Step 5: Verify in WeChat DevTools**

Run: open this repository in WeChat DevTools, upload/deploy `api`, create seed collections, and load `pages/shop/index`.

Expected: product list renders with shop announcement, categories, prices, and add buttons.

- [ ] **Step 6: Commit**

```bash
git add cloudfunctions/api miniprogram/services miniprogram/pages/shop
git commit -m "feat: add storefront catalogue"
```

## Task 6: Checkout and Order Creation

**Files:**
- Create: `cloudfunctions/api/lib/orders.js`
- Modify: `cloudfunctions/api/index.js`
- Create: `tests/order-domain.test.js`
- Create: `miniprogram/pages/checkout/index.js`
- Create: `miniprogram/pages/checkout/index.json`
- Create: `miniprogram/pages/checkout/index.wxml`
- Create: `miniprogram/pages/checkout/index.wxss`

- [ ] **Step 1: Write order amount tests**

```js
import { describe, expect, it } from 'vitest';
import ordersModule from '../cloudfunctions/api/lib/orders.js';

const { buildOrderItems, createOrderNo } = ordersModule;

describe('order domain', () => {
  it('copies product snapshots and computes subtotals', () => {
    const products = [{ _id: 'p1', name: '水', spec: '19L', images: ['a'], priceFen: 1800 }];
    const items = buildOrderItems([{ productId: 'p1', quantity: 2 }], products);
    expect(items[0]).toMatchObject({ productId: 'p1', name: '水', priceFen: 1800, quantity: 2, subtotalFen: 3600 });
  });

  it('creates merchant order numbers with W prefix', () => {
    expect(createOrderNo('openid123', new Date('2026-06-29T10:00:00Z'))).toMatch(/^W20260629\d{8}$/);
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- tests/order-domain.test.js`

Expected: FAIL because `orders.js` does not exist.

- [ ] **Step 3: Implement order domain and `createOrder` action**

```js
const { COLLECTIONS } = require('./db');
const { ok } = require('./response');

function createOrderNo(openId, now = new Date()) {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const suffix = Math.abs(hashString(`${openId}-${now.getTime()}`)).toString().padStart(8, '0').slice(0, 8);
  return `W${y}${m}${d}${suffix}`;
}

function buildOrderItems(cartItems, products) {
  return cartItems.map((cartItem) => {
    const product = products.find((item) => item._id === cartItem.productId);
    if (!product || product.status === 'off_sale') throw new Error('商品已下架');
    const quantity = Number(cartItem.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('商品数量不正确');
    return {
      productId: product._id,
      name: product.name,
      spec: product.spec,
      image: product.images && product.images[0] ? product.images[0] : '',
      priceFen: product.priceFen,
      quantity,
      subtotalFen: product.priceFen * quantity
    };
  });
}

async function createOrder(data, ctx) {
  const cartItems = data.items || [];
  if (!cartItems.length) throw new Error('请选择商品');
  const ids = cartItems.map((item) => item.productId);
  const productsResult = await ctx.db.collection(COLLECTIONS.products).where({ _id: ctx.db.command.in(ids) }).get();
  const items = buildOrderItems(cartItems, productsResult.data);
  const goodsAmountFen = items.reduce((sum, item) => sum + item.subtotalFen, 0);
  const now = new Date();
  const order = {
    orderNo: createOrderNo(ctx.openId, now),
    userOpenId: ctx.openId,
    items,
    goodsAmountFen,
    deliveryFeeFen: 0,
    payAmountFen: goodsAmountFen,
    receiverName: data.receiverName,
    receiverPhone: data.receiverPhone,
    receiverAddress: data.receiverAddress,
    remark: data.remark || '',
    status: 'pending_payment',
    payStatus: 'not_paid',
    deliveryStatus: 'not_started',
    refundStatus: 'none',
    wechatShippingUploadStatus: 'pending',
    createdAt: now,
    updatedAt: now
  };
  const result = await ctx.db.collection(COLLECTIONS.orders).add({ data: order });
  return ok({ orderId: result._id, orderNo: order.orderNo, payAmountFen: order.payAmountFen });
}

function hashString(input) {
  return String(input).split('').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

module.exports = { createOrderNo, buildOrderItems, createOrder };
```

- [ ] **Step 4: Register action and implement checkout page**

```js
const { createOrder } = require('./lib/orders');

const actions = {
  ping: async () => ({ ok: true, data: { pong: true } }),
  getShopConfig,
  getSession,
  listProducts,
  createOrder
};
```

```js
import { callApi } from '../../services/api';
import { validateReceiver } from '../../utils/validators';

Page({
  data: {
    items: [],
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    remark: '',
    submitting: false
  },
  onLoad(query) {
    const cart = query.cart ? JSON.parse(decodeURIComponent(query.cart)) : {};
    this.setData({ items: Object.keys(cart).map((productId) => ({ productId, quantity: cart[productId] })) });
  },
  updateField(event) {
    this.setData({ [event.currentTarget.dataset.field]: event.detail.value });
  },
  async submitOrder() {
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
    this.setData({ submitting: true });
    const order = await callApi('createOrder', {
      items: this.data.items,
      receiverName: receiver.name,
      receiverPhone: receiver.phone,
      receiverAddress: receiver.address,
      remark: this.data.remark
    });
    wx.navigateTo({ url: `/pages/order-detail/index?id=${order.orderId}` });
  }
});
```

- [ ] **Step 5: Verify tests and checkout creation**

Run: `npm test -- tests/order-domain.test.js && npm run lint`

Expected: PASS and syntax checks pass. In DevTools, checkout creates a pending order in `orders`.

- [ ] **Step 6: Commit**

```bash
git add cloudfunctions/api miniprogram/pages/checkout tests/order-domain.test.js
git commit -m "feat: create pending orders"
```

## Task 7: Official WeChat Pay Launch

**Files:**
- Create: `cloudfunctions/api/lib/payments.js`
- Modify: `cloudfunctions/api/index.js`
- Modify: `miniprogram/pages/checkout/index.js`
- Modify: `docs/deployment.md`

- [ ] **Step 1: Implement `createPayment` action**

```js
const { COLLECTIONS } = require('./db');
const { ok } = require('./response');

async function createPayment(data, ctx) {
  const order = await ctx.db.collection(COLLECTIONS.orders).doc(data.orderId).get();
  if (!order.data || order.data.userOpenId !== ctx.openId) throw new Error('订单不存在');
  if (order.data.status !== 'pending_payment') throw new Error('订单状态不可支付');

  const payment = {
    orderId: data.orderId,
    orderNo: order.data.orderNo,
    outTradeNo: order.data.orderNo,
    amountFen: order.data.payAmountFen,
    status: 'created',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  await ctx.db.collection(COLLECTIONS.payments).add({ data: payment });

  const payParams = await ctx.cloud.cloudPay.unifiedOrder({
    body: `水饮到家-${order.data.orderNo}`,
    outTradeNo: order.data.orderNo,
    spbillCreateIp: '127.0.0.1',
    subMchId: process.env.WX_PAY_SUB_MCH_ID,
    totalFee: order.data.payAmountFen,
    envId: process.env.WX_CLOUD_ENV_ID,
    functionName: 'payNotify',
    tradeType: 'JSAPI'
  });

  return ok({
    orderId: data.orderId,
    payment: payParams.payment
  });
}

module.exports = { createPayment };
```

- [ ] **Step 2: Register payment action**

```js
const { createPayment } = require('./lib/payments');

const actions = {
  ping: async () => ({ ok: true, data: { pong: true } }),
  getShopConfig,
  getSession,
  listProducts,
  createOrder,
  createPayment
};
```

- [ ] **Step 3: Launch payment after order creation**

```js
const order = await callApi('createOrder', payload);
const pay = await callApi('createPayment', { orderId: order.orderId });
await wx.requestPayment(pay.payment);
wx.redirectTo({ url: `/pages/order-detail/index?id=${order.orderId}` });
```

- [ ] **Step 4: Document payment configuration**

```md
## WeChat Pay

Configure these cloud function environment variables in WeChat DevTools or Cloud Development console:

- `WX_CLOUD_ENV_ID`: cloud environment id used by payment callbacks.
- `WX_PAY_SUB_MCH_ID`: merchant id associated with the mini program.

Use CloudPay first. If the account cannot use CloudPay, replace `cloud.cloudPay.unifiedOrder` with WeChat Pay v3 direct API calls inside `cloudfunctions/api/lib/payments.js` and keep the frontend `createPayment` response shape unchanged.
```

- [ ] **Step 5: Verify in sandbox/real merchant test**

Run in DevTools with a bound merchant account.

Expected: `wx.requestPayment` opens the WeChat payment sheet. Cancelling payment leaves order as `pending_payment`.

- [ ] **Step 6: Commit**

```bash
git add cloudfunctions/api miniprogram/pages/checkout docs/deployment.md
git commit -m "feat: launch official wechat payment"
```

## Task 8: Payment Callback and Order Detail

**Files:**
- Create: `cloudfunctions/payNotify/package.json`
- Create: `cloudfunctions/payNotify/index.js`
- Create: `cloudfunctions/api/lib/orderQueries.js`
- Modify: `cloudfunctions/api/index.js`
- Create: `miniprogram/pages/order-detail/index.js`
- Create: `miniprogram/pages/order-detail/index.json`
- Create: `miniprogram/pages/order-detail/index.wxml`
- Create: `miniprogram/pages/order-detail/index.wxss`

- [ ] **Step 1: Implement idempotent pay callback**

```js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const db = cloud.database();
  const orderNo = event.outTradeNo || event.out_trade_no;
  const transactionId = event.transactionId || event.transaction_id;
  const paidAt = new Date();

  const orders = await db.collection('orders').where({ orderNo }).limit(1).get();
  if (!orders.data.length) {
    console.error('[payNotify] order not found', orderNo);
    return { errcode: 0, errmsg: 'ok' };
  }

  const order = orders.data[0];
  if (order.payStatus === 'paid') {
    return { errcode: 0, errmsg: 'ok' };
  }

  await db.collection('orders').doc(order._id).update({
    data: {
      status: 'paid_waiting_delivery',
      payStatus: 'paid',
      wechatTransactionId: transactionId,
      paidAt,
      updatedAt: paidAt
    }
  });

  const paymentRows = await db.collection('payments').where({ outTradeNo: orderNo }).limit(1).get();
  if (paymentRows.data.length) {
    await db.collection('payments').doc(paymentRows.data[0]._id).update({
      data: {
        status: 'success',
        transactionId,
        callbackReceivedAt: paidAt,
        callbackSummary: { orderNo, transactionId },
        updatedAt: paidAt
      }
    });
  }

  return { errcode: 0, errmsg: 'ok' };
};
```

- [ ] **Step 2: Add order query actions**

```js
const { COLLECTIONS } = require('./db');
const { ok } = require('./response');

async function getMyOrder(data, ctx) {
  const result = await ctx.db.collection(COLLECTIONS.orders).doc(data.orderId).get();
  if (!result.data || result.data.userOpenId !== ctx.openId) throw new Error('订单不存在');
  return ok(result.data);
}

async function listMyOrders(data, ctx) {
  const result = await ctx.db.collection(COLLECTIONS.orders)
    .where({ userOpenId: ctx.openId })
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return ok({ orders: result.data });
}

module.exports = { getMyOrder, listMyOrders };
```

- [ ] **Step 3: Build order detail page**

```js
import { callApi } from '../../services/api';
import { orderStatusLabel } from '../../utils/status';
import { formatFen } from '../../utils/money';

Page({
  data: { order: null, statusText: '', amountText: '' },
  async onLoad(query) {
    const order = await callApi('getMyOrder', { orderId: query.id });
    this.setData({
      order,
      statusText: orderStatusLabel(order.status),
      amountText: formatFen(order.payAmountFen)
    });
  }
});
```

- [ ] **Step 4: Verify callback and detail**

Run a test payment, then inspect cloud database.

Expected: `orders.payStatus` becomes `paid`, `orders.status` becomes `paid_waiting_delivery`, `payments.status` becomes `success`, and order detail shows “已支付/待配送”.

- [ ] **Step 5: Commit**

```bash
git add cloudfunctions/payNotify cloudfunctions/api miniprogram/pages/order-detail
git commit -m "feat: handle payment callbacks"
```

## Task 9: Customer Order List

**Files:**
- Create: `miniprogram/pages/orders/index.js`
- Create: `miniprogram/pages/orders/index.json`
- Create: `miniprogram/pages/orders/index.wxml`
- Create: `miniprogram/pages/orders/index.wxss`
- Modify: `miniprogram/pages/shop/index.wxml`

- [ ] **Step 1: Implement customer order list**

```js
import { callApi } from '../../services/api';
import { orderStatusLabel } from '../../utils/status';
import { formatFen } from '../../utils/money';

Page({
  data: { orders: [], loading: true },
  async onShow() {
    const data = await callApi('listMyOrders');
    this.setData({
      orders: data.orders.map((order) => ({
        ...order,
        statusText: orderStatusLabel(order.status),
        amountText: formatFen(order.payAmountFen)
      })),
      loading: false
    });
  },
  openOrder(event) {
    wx.navigateTo({ url: `/pages/order-detail/index?id=${event.currentTarget.dataset.id}` });
  }
});
```

- [ ] **Step 2: Add storefront entry**

```xml
<button bindtap="goOrders">我的订单</button>
```

```js
goOrders() {
  wx.navigateTo({ url: '/pages/orders/index' });
}
```

- [ ] **Step 3: Verify**

Run in DevTools with two orders for the same user.

Expected: order list shows only the current OpenID's orders and opens the correct detail page.

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/orders miniprogram/pages/shop
git commit -m "feat: add customer order list"
```

## Task 10: Admin Auth and Product Management

**Files:**
- Modify: `cloudfunctions/api/lib/products.js`
- Modify: `cloudfunctions/api/index.js`
- Create: `miniprogram/pages/admin/index/index.js`
- Create: `miniprogram/pages/admin/products/index.js`
- Create: `miniprogram/pages/admin/product-edit/index.js`
- Add corresponding `.json`, `.wxml`, `.wxss` page files.

- [ ] **Step 1: Add admin product actions**

```js
const { requireAdmin } = require('./admins');

async function adminListProducts(data, ctx) {
  await requireAdmin(ctx);
  const result = await ctx.db.collection(COLLECTIONS.products).orderBy('sortOrder', 'asc').get();
  return ok({ products: result.data });
}

async function saveProduct(data, ctx) {
  await requireAdmin(ctx);
  const now = new Date();
  const product = {
    name: data.name,
    categoryId: data.categoryId,
    images: data.images || [],
    spec: data.spec || '',
    description: data.description || '',
    priceFen: Number(data.priceFen),
    status: data.status === 'off_sale' ? 'off_sale' : 'on_sale',
    sortOrder: Number(data.sortOrder || 100),
    stockEnabled: false,
    stock: null,
    updatedAt: now
  };
  if (data._id) {
    await ctx.db.collection(COLLECTIONS.products).doc(data._id).update({ data: product });
    return ok({ productId: data._id });
  }
  const result = await ctx.db.collection(COLLECTIONS.products).add({ data: { ...product, createdAt: now } });
  return ok({ productId: result._id });
}
```

- [ ] **Step 2: Register admin actions**

```js
const { listProducts, adminListProducts, saveProduct } = require('./lib/products');
```

```js
adminListProducts,
saveProduct
```

- [ ] **Step 3: Build admin dashboard and products pages**

```js
import { callApi } from '../../../services/api';

Page({
  data: { products: [] },
  async onShow() {
    const data = await callApi('adminListProducts');
    this.setData({ products: data.products });
  },
  createProduct() {
    wx.navigateTo({ url: '/pages/admin/product-edit/index' });
  },
  editProduct(event) {
    wx.navigateTo({ url: `/pages/admin/product-edit/index?id=${event.currentTarget.dataset.id}` });
  }
});
```

- [ ] **Step 4: Verify**

Run as non-admin OpenID and call `adminListProducts`.

Expected: API returns error message “需要管理员权限”. Add the OpenID to `admins`, retry, and product list renders.

- [ ] **Step 5: Commit**

```bash
git add cloudfunctions/api miniprogram/pages/admin
git commit -m "feat: add admin product management"
```

## Task 11: Admin Orders and Shipping Upload

**Files:**
- Create: `cloudfunctions/api/lib/shipping.js`
- Modify: `cloudfunctions/api/lib/orders.js`
- Modify: `cloudfunctions/api/index.js`
- Create: `miniprogram/pages/admin/orders/index.js`
- Create: `miniprogram/pages/admin/order-detail/index.js`
- Add corresponding `.json`, `.wxml`, `.wxss` page files.

- [ ] **Step 1: Add shipping upload module**

```js
async function uploadShippingInfo(order, ctx) {
  const payload = {
    order_key: {
      order_number_type: 2,
      mchid: process.env.WX_PAY_SUB_MCH_ID,
      out_trade_no: order.orderNo
    },
    logistics_type: 3,
    delivery_mode: 1,
    shipping_list: [{
      item_desc: order.items.map((item) => `${item.name}x${item.quantity}`).join('，'),
      contact: {
        receiver_contact: order.receiverPhone
      }
    }],
    upload_time: new Date().toISOString(),
    payer: {
      openid: order.userOpenId
    }
  };
  return ctx.cloud.openapi.orderShipping.uploadShippingInfo(payload);
}

module.exports = { uploadShippingInfo };
```

- [ ] **Step 2: Add admin order actions**

```js
async function adminListOrders(data, ctx) {
  await requireAdmin(ctx);
  const where = data.status ? { status: data.status } : {};
  const result = await ctx.db.collection(COLLECTIONS.orders).where(where).orderBy('createdAt', 'desc').limit(100).get();
  return ok({ orders: result.data });
}

async function startDelivery(data, ctx) {
  await requireAdmin(ctx);
  const orderResult = await ctx.db.collection(COLLECTIONS.orders).doc(data.orderId).get();
  const order = orderResult.data;
  if (!order || order.status !== 'paid_waiting_delivery') throw new Error('订单状态不可配送');
  const now = new Date();
  await ctx.db.collection(COLLECTIONS.orders).doc(data.orderId).update({
    data: { status: 'delivering', deliveryStatus: 'delivering', deliveryStartedAt: now, wechatShippingUploadStatus: 'pending', updatedAt: now }
  });
  try {
    await uploadShippingInfo(order, ctx);
    await ctx.db.collection(COLLECTIONS.orders).doc(data.orderId).update({
      data: { wechatShippingUploadStatus: 'uploaded', wechatShippingUploadedAt: new Date(), updatedAt: new Date() }
    });
  } catch (error) {
    await ctx.db.collection(COLLECTIONS.orders).doc(data.orderId).update({
      data: { wechatShippingUploadStatus: 'failed', wechatShippingError: error.message, updatedAt: new Date() }
    });
  }
  return ok({ orderId: data.orderId });
}

async function completeOrder(data, ctx) {
  await requireAdmin(ctx);
  const now = new Date();
  await ctx.db.collection(COLLECTIONS.orders).doc(data.orderId).update({
    data: { status: 'completed', deliveryStatus: 'completed', completedAt: now, updatedAt: now }
  });
  return ok({ orderId: data.orderId });
}
```

- [ ] **Step 3: Build admin order pages**

```js
import { callApi } from '../../../services/api';
import { orderStatusLabel } from '../../../utils/status';

Page({
  data: { orders: [] },
  async onShow() {
    const data = await callApi('adminListOrders');
    this.setData({ orders: data.orders.map((order) => ({ ...order, statusText: orderStatusLabel(order.status) })) });
  },
  openOrder(event) {
    wx.navigateTo({ url: `/pages/admin/order-detail/index?id=${event.currentTarget.dataset.id}` });
  }
});
```

- [ ] **Step 4: Verify shipping sync**

Run an order through paid state, then click “开始配送”.

Expected: order becomes `delivering`; `wechatShippingUploadStatus` becomes `uploaded` when API succeeds or `failed` with visible admin retry/manual guidance when API fails.

- [ ] **Step 5: Commit**

```bash
git add cloudfunctions/api miniprogram/pages/admin/orders miniprogram/pages/admin/order-detail
git commit -m "feat: add admin order shipping"
```

## Task 12: Refund Flow

**Files:**
- Create: `cloudfunctions/api/lib/refunds.js`
- Modify: `cloudfunctions/api/index.js`
- Create: `cloudfunctions/refundNotify/package.json`
- Create: `cloudfunctions/refundNotify/index.js`
- Modify: `miniprogram/pages/admin/order-detail/index.js`

- [ ] **Step 1: Add refund action**

```js
async function requestRefund(data, ctx) {
  await requireAdmin(ctx);
  const orderResult = await ctx.db.collection(COLLECTIONS.orders).doc(data.orderId).get();
  const order = orderResult.data;
  if (!order || order.payStatus !== 'paid' || order.refundStatus !== 'none') throw new Error('订单不可退款');
  const outRefundNo = `R${order.orderNo}`;
  await ctx.db.collection(COLLECTIONS.refunds).add({
    data: {
      orderId: data.orderId,
      orderNo: order.orderNo,
      outRefundNo,
      amountFen: order.payAmountFen,
      reason: data.reason || '商家退款',
      status: 'processing',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
  await ctx.cloud.cloudPay.refund({
    outTradeNo: order.orderNo,
    outRefundNo,
    totalFee: order.payAmountFen,
    refundFee: order.payAmountFen,
    subMchId: process.env.WX_PAY_SUB_MCH_ID,
    envId: process.env.WX_CLOUD_ENV_ID,
    functionName: 'refundNotify'
  });
  await ctx.db.collection(COLLECTIONS.orders).doc(data.orderId).update({
    data: { status: 'refunding', refundStatus: 'processing', updatedAt: new Date() }
  });
  return ok({ outRefundNo });
}
```

- [ ] **Step 2: Add refund callback**

```js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const db = cloud.database();
  const outRefundNo = event.outRefundNo || event.out_refund_no;
  const refundId = event.refundId || event.refund_id;
  const rows = await db.collection('refunds').where({ outRefundNo }).limit(1).get();
  if (!rows.data.length) return { errcode: 0, errmsg: 'ok' };
  const refund = rows.data[0];
  await db.collection('refunds').doc(refund._id).update({
    data: { status: 'success', refundId, callbackReceivedAt: new Date(), callbackSummary: event, updatedAt: new Date() }
  });
  await db.collection('orders').doc(refund.orderId).update({
    data: { status: 'refunded', payStatus: 'refunded', refundStatus: 'success', updatedAt: new Date() }
  });
  return { errcode: 0, errmsg: 'ok' };
};
```

- [ ] **Step 3: Verify**

Run a real low-value paid order refund in merchant test environment.

Expected: order moves `paid_waiting_delivery` -> `refunding` -> `refunded`; refund record stores `refundId`.

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/api cloudfunctions/refundNotify miniprogram/pages/admin/order-detail
git commit -m "feat: add wechat refund flow"
```

## Task 13: Subscription Messages

**Files:**
- Create: `cloudfunctions/api/lib/notifications.js`
- Modify: `cloudfunctions/api/index.js`
- Modify: `cloudfunctions/payNotify/index.js`
- Modify: `miniprogram/pages/admin/index/index.js`
- Modify: `docs/deployment.md`

- [ ] **Step 1: Add notification subscription action**

```js
async function enableAdminNewOrderNotice(data, ctx) {
  await requireAdmin(ctx);
  await ctx.db.collection(COLLECTIONS.admins).where({ openId: ctx.openId }).update({
    data: { newOrderNoticeEnabled: true, updatedAt: new Date() }
  });
  return ok({ enabled: true });
}
```

- [ ] **Step 2: Request admin subscription in mini program**

```js
async enableNotice() {
  const shop = await callApi('getShopConfig');
  const templateId = shop.templateIds && shop.templateIds.newOrder;
  if (!templateId) {
    wx.showToast({ title: '新订单提醒未配置', icon: 'none' });
    return;
  }
  await wx.requestSubscribeMessage({ tmplIds: [templateId] });
  await callApi('enableAdminNewOrderNotice');
  wx.showToast({ title: '已开启提醒' });
}
```

- [ ] **Step 3: Send new order notice from payment callback**

```js
async function sendNewOrderNotice(cloud, db, order) {
  const admins = await db.collection('admins').where({ enabled: true, newOrderNoticeEnabled: true }).get();
  await Promise.all(admins.data.map((admin) => cloud.openapi.subscribeMessage.send({
    touser: admin.openId,
    templateId: process.env.NEW_ORDER_TEMPLATE_ID,
    page: `/pages/admin/order-detail/index?id=${order._id}`,
    data: {
      thing1: { value: '新订单待配送' },
      amount2: { value: `${(order.payAmountFen / 100).toFixed(2)}元` },
      thing3: { value: order.receiverAddress.slice(0, 20) }
    }
  }).catch((error) => console.error('[notice]', admin.openId, error))));
}
```

- [ ] **Step 4: Document template IDs**

```md
## Subscription Templates

Configure cloud function environment variable `NEW_ORDER_TEMPLATE_ID` with the template selected in WeChat public platform. Store the same template ID in `shop_config.templateIds.newOrder` so the admin page can request subscription permission before cloud functions send messages.
Admin users must tap “开启新订单提醒” in the merchant dashboard before receiving messages.
```

- [ ] **Step 5: Verify**

Authorize new order subscription as admin, pay for an order, and check WeChat service notification.

Expected: admin receives a new order message when subscription permission is accepted; failed sends are logged but payment state remains correct.

- [ ] **Step 6: Commit**

```bash
git add cloudfunctions miniprogram/pages/admin/index docs/deployment.md
git commit -m "feat: add subscription notifications"
```

## Task 14: Platform Shipping Events

**Files:**
- Create: `cloudfunctions/platformNotify/package.json`
- Create: `cloudfunctions/platformNotify/index.js`
- Modify: `docs/deployment.md`

- [ ] **Step 1: Add platform event handler**

```js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const db = cloud.database();
  console.log('[platformNotify]', event);
  const orderNo = event.merchant_trade_no;
  if (!orderNo) return { errcode: 0, errmsg: 'ok' };
  const rows = await db.collection('orders').where({ orderNo }).limit(1).get();
  if (!rows.data.length) return { errcode: 0, errmsg: 'ok' };
  if (event.Event === 'trade_manage_order_settlement') {
    await db.collection('orders').doc(rows.data[0]._id).update({
      data: {
        wechatShippingUploadStatus: 'uploaded',
        wechatShippingUploadedAt: event.shipped_time ? new Date(event.shipped_time * 1000) : rows.data[0].wechatShippingUploadedAt,
        updatedAt: new Date()
      }
    });
  }
  return { errcode: 0, errmsg: 'ok' };
};
```

- [ ] **Step 2: Document message push setup**

```md
## Platform Message Push

Configure WeChat Mini Program message push URL or cloud function binding so order shipping events reach `platformNotify`.
Track these events in logs: `trade_manage_remind_access_api`, `trade_manage_remind_shipping`, `trade_manage_order_settlement`, `wxa_trade_controlled`.
```

- [ ] **Step 3: Verify**

Use WeChat platform test tools or a real shipping event.

Expected: platform event is logged and matching order shipping fields update when `merchant_trade_no` exists.

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/platformNotify docs/deployment.md
git commit -m "feat: handle shipping platform events"
```

## Task 15: Security Rules and Release Checklist

**Files:**
- Create: `docs/security-rules.md`
- Modify: `docs/deployment.md`
- Create: `docs/release-checklist.md`

- [ ] **Step 1: Write database security rules**

```md
# Security Rules

Apply restrictive database permissions:

- `products`, `categories`, `shop_config`: public read, no direct client write.
- `orders`: no direct public read or write; access through `api` cloud function.
- `payments`, `refunds`, `admins`, `users`: no direct public read or write; access through `api` cloud function.

All mutations are performed by cloud functions after OpenID and admin checks.
```

- [ ] **Step 2: Write release checklist**

```md
# Release Checklist

- Mini Program is certified.
- WeChat Pay merchant account is approved and bound to AppID.
- Cloud environment is created and selected in WeChat DevTools.
- Collections are created and seeded.
- Administrator OpenID is inserted into `admins`.
- Subscription templates are configured.
- Payment callback, refund callback, and platform message callback are deployed.
- Order shipping management service is confirmed with `/wxa/sec/order/is_trade_managed`.
- A real low-value payment succeeds.
- Shipping upload succeeds or manual upload fallback is documented for the merchant.
- A real low-value refund succeeds.
- Non-admin users cannot open admin pages or call admin APIs.
```

- [ ] **Step 3: Run complete verification**

Run: `npm test && npm run lint`

Expected: all unit tests pass and cloud function syntax checks pass.

- [ ] **Step 4: Manual end-to-end verification**

In WeChat DevTools and a real device, verify:

- user opens shop from share card
- user creates order
- user pays
- admin receives notice
- admin starts delivery
- shipping upload status is visible
- admin completes order
- admin refunds a paid order

- [ ] **Step 5: Commit**

```bash
git add docs
git commit -m "docs: add security and release checklist"
```

## Implementation Notes

- Keep all money values in cents.
- Treat payment and refund callbacks as idempotent.
- Do not trust frontend payment success as final order state.
- Keep the order item snapshot immutable after creation.
- Keep admin checks in cloud functions even if admin pages are hidden in the client.
- Use WeChat DevTools and real-device tests for payment, refund, subscription message, and shipping APIs because these cannot be fully proven by unit tests alone.
