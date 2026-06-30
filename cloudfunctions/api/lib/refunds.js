const { requireAdmin } = require('./admins');
const { COLLECTIONS } = require('./db');
const { validationError } = require('./errors');
const { ok } = require('./response');

async function requestRefund(data, ctx) {
  await requireAdmin(ctx);
  if (!data.orderId) {
    throw validationError('订单不可退款');
  }

  const orderDoc = ctx.db.collection(COLLECTIONS.orders).doc(data.orderId);
  const orderResult = await orderDoc.get();
  const order = orderResult.data;
  if (!isRefundable(order)) {
    throw validationError('订单不可退款');
  }

  const config = getRefundConfig(ctx);
  const now = new Date();
  const outRefundNo = `R${order.orderNo}`;
  await ctx.db.collection(COLLECTIONS.refunds).add({
    data: {
      orderId: data.orderId,
      orderNo: order.orderNo,
      outRefundNo,
      amountFen: order.payAmountFen,
      reason: data.reason || '商家退款',
      status: 'processing',
      createdAt: now,
      updatedAt: now
    }
  });

  await ctx.cloud.cloudPay.refund({
    outTradeNo: order.orderNo,
    outRefundNo,
    totalFee: order.payAmountFen,
    refundFee: order.payAmountFen,
    subMchId: config.subMchId,
    envId: config.envId,
    functionName: 'refundNotify'
  });

  await orderDoc.update({
    data: {
      status: 'refunding',
      refundStatus: 'processing',
      updatedAt: new Date()
    }
  });
  return ok({ outRefundNo });
}

function isRefundable(order) {
  return Boolean(
    order
    && order.payStatus === 'paid'
    && order.refundStatus === 'none'
    && Number.isInteger(order.payAmountFen)
    && order.payAmountFen > 0
  );
}

function getRefundConfig(ctx) {
  if (!process.env.WX_CLOUD_ENV_ID || !process.env.WX_PAY_SUB_MCH_ID || !ctx.cloud || !ctx.cloud.cloudPay) {
    throw validationError('退款配置未完成');
  }
  return {
    envId: process.env.WX_CLOUD_ENV_ID,
    subMchId: process.env.WX_PAY_SUB_MCH_ID
  };
}

module.exports = { requestRefund };
