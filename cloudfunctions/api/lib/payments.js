const { COLLECTIONS } = require('./db');
const { validationError } = require('./errors');
const { ok } = require('./response');

async function createPayment(data, ctx) {
  if (!data.orderId) {
    throw validationError('订单不存在');
  }
  const orderResult = await ctx.db.collection(COLLECTIONS.orders).doc(data.orderId).get();
  const order = orderResult.data;
  if (!order || order.userOpenId !== ctx.openId) {
    throw validationError('订单不存在');
  }
  if (order.status !== 'pending_payment') {
    throw validationError('订单状态不可支付');
  }
  if (!Number.isInteger(order.payAmountFen) || order.payAmountFen <= 0) {
    throw validationError('订单金额不正确');
  }
  const config = getPaymentConfig(ctx);

  const now = new Date();
  const payment = {
    orderId: data.orderId,
    orderNo: order.orderNo,
    outTradeNo: order.orderNo,
    amountFen: order.payAmountFen,
    status: 'created',
    createdAt: now,
    updatedAt: now
  };
  await ctx.db.collection(COLLECTIONS.payments).add({ data: payment });

  const payParams = await ctx.cloud.cloudPay.unifiedOrder({
    body: `水饮到家-${order.orderNo}`,
    outTradeNo: order.orderNo,
    spbillCreateIp: '127.0.0.1',
    subMchId: config.subMchId,
    totalFee: order.payAmountFen,
    envId: config.envId,
    functionName: 'payNotify',
    tradeType: 'JSAPI'
  });

  return ok({
    orderId: data.orderId,
    payment: payParams.payment
  });
}

function getPaymentConfig(ctx) {
  if (!process.env.WX_CLOUD_ENV_ID || !process.env.WX_PAY_SUB_MCH_ID || !ctx.cloud || !ctx.cloud.cloudPay) {
    throw validationError('支付配置未完成');
  }
  return {
    envId: process.env.WX_CLOUD_ENV_ID,
    subMchId: process.env.WX_PAY_SUB_MCH_ID
  };
}

module.exports = { createPayment };
