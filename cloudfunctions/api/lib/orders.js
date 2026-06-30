const { COLLECTIONS } = require('./db');
const { requireAdmin } = require('./admins');
const { validationError } = require('./errors');
const { ok } = require('./response');
const { uploadShippingInfo } = require('./shipping');
const { randomInt } = require('crypto');

const PROCESS_ENTROPY = randomInt(0, 10000);
let orderSequence = 0;

function createOrderNo(openId, now = new Date()) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  orderSequence = (orderSequence + 1) % 10000;
  const hashPart = String((Math.abs(hashString(`${openId}-${now.getTime()}`)) + PROCESS_ENTROPY) % 10000).padStart(4, '0');
  const sequencePart = String(orderSequence).padStart(4, '0');
  const suffix = `${hashPart}${sequencePart}`;
  return `W${year}${month}${day}${suffix}`;
}

function buildOrderItems(cartItems, products) {
  return cartItems.map((cartItem) => {
    const product = products.find((item) => item._id === cartItem.productId);
    if (!product || product.status !== 'on_sale') {
      throw validationError('商品已下架');
    }

    const quantity = Number(cartItem.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw validationError('商品数量不正确');
    }
    if (!Number.isInteger(product.priceFen) || product.priceFen < 0) {
      throw validationError('商品价格不正确');
    }

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
  const cartItems = Array.isArray(data.items) ? data.items : [];
  if (!cartItems.length) {
    throw validationError('请选择商品');
  }
  const receiver = validateReceiver(data);

  const ids = cartItems.map((item) => item.productId);
  const productsResult = await ctx.db
    .collection(COLLECTIONS.products)
    .where({ _id: ctx.db.command.in(ids) })
    .get();
  const items = buildOrderItems(cartItems, productsResult.data || []);
  const goodsAmountFen = items.reduce((sum, item) => sum + item.subtotalFen, 0);
  const now = new Date();
  const order = {
    orderNo: createOrderNo(ctx.openId, now),
    userOpenId: ctx.openId,
    items,
    goodsAmountFen,
    deliveryFeeFen: 0,
    payAmountFen: goodsAmountFen,
    receiverName: receiver.name,
    receiverPhone: receiver.phone,
    receiverAddress: receiver.address,
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

async function adminListOrders(data, ctx) {
  await requireAdmin(ctx);
  const where = data.status ? { status: data.status } : {};
  const result = await ctx.db.collection(COLLECTIONS.orders)
    .where(where)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();
  return ok({ orders: result.data || [] });
}

async function startDelivery(data, ctx) {
  await requireAdmin(ctx);
  if (!data.orderId) {
    throw validationError('订单不存在');
  }

  const orderDoc = ctx.db.collection(COLLECTIONS.orders).doc(data.orderId);
  const orderResult = await orderDoc.get();
  const order = orderResult.data;
  if (!order || order.status !== 'paid_waiting_delivery') {
    throw validationError('订单状态不可配送');
  }

  const now = new Date();
  await orderDoc.update({
    data: {
      status: 'delivering',
      deliveryStatus: 'delivering',
      deliveryStartedAt: now,
      wechatShippingUploadStatus: 'pending',
      updatedAt: now
    }
  });

  try {
    const uploader = ctx.uploadShippingInfo || uploadShippingInfo;
    await uploader(order, ctx);
    const uploadedAt = new Date();
    await orderDoc.update({
      data: {
        wechatShippingUploadStatus: 'uploaded',
        wechatShippingUploadedAt: uploadedAt,
        wechatShippingError: '',
        updatedAt: uploadedAt
      }
    });
  } catch (error) {
    const failedAt = new Date();
    await orderDoc.update({
      data: {
        wechatShippingUploadStatus: 'failed',
        wechatShippingError: error && error.message ? error.message : '发货信息同步失败',
        updatedAt: failedAt
      }
    });
  }

  return ok({ orderId: data.orderId });
}

async function completeOrder(data, ctx) {
  await requireAdmin(ctx);
  if (!data.orderId) {
    throw validationError('订单不存在');
  }

  const orderDoc = ctx.db.collection(COLLECTIONS.orders).doc(data.orderId);
  const orderResult = await orderDoc.get();
  const order = orderResult.data;
  if (!order || order.status !== 'delivering') {
    throw validationError('订单状态不可完成');
  }

  const now = new Date();
  await orderDoc.update({
    data: {
      status: 'completed',
      deliveryStatus: 'completed',
      completedAt: now,
      updatedAt: now
    }
  });
  return ok({ orderId: data.orderId });
}

function validateReceiver(data) {
  const name = String(data.receiverName || '').trim();
  const phone = String(data.receiverPhone || '').trim();
  const address = String(data.receiverAddress || '').trim();
  if (!name) {
    throw validationError('请填写收货人');
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    throw validationError('请填写正确手机号');
  }
  if (!address) {
    throw validationError('请填写收货地址');
  }
  return { name, phone, address };
}

function hashString(input) {
  return String(input)
    .split('')
    .reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

module.exports = {
  adminListOrders,
  buildOrderItems,
  completeOrder,
  createOrder,
  createOrderNo,
  startDelivery
};
