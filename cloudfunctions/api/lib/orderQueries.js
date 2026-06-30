const { COLLECTIONS } = require('./db');
const { validationError } = require('./errors');
const { ok } = require('./response');

async function getMyOrder(data, ctx) {
  if (!data.orderId) {
    throw validationError('订单不存在');
  }
  const result = await ctx.db.collection(COLLECTIONS.orders).doc(data.orderId).get();
  if (!result.data || result.data.userOpenId !== ctx.openId) {
    throw validationError('订单不存在');
  }
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
