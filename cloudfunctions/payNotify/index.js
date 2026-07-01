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

  try {
    await sendNewOrderNotice(cloud, db, order);
  } catch (error) {
    console.error('[notice]', orderNo, error);
  }

  return { errcode: 0, errmsg: 'ok' };
};

async function sendNewOrderNotice(cloud, db, order) {
  const admins = await db.collection('admins').where({
    enabled: true,
    newOrderNoticeEnabled: true
  }).get();
  const adminRows = Array.isArray(admins.data) ? admins.data : [];
  if (!adminRows.length) {
    return;
  }

  const templateId = process.env.NEW_ORDER_TEMPLATE_ID;
  if (!templateId) {
    console.error('[notice] NEW_ORDER_TEMPLATE_ID not configured');
    return;
  }
  const subscribeMessage = cloud.openapi && cloud.openapi.subscribeMessage;
  if (!subscribeMessage || typeof subscribeMessage.send !== 'function') {
    console.error('[notice] subscribeMessage OpenAPI unavailable');
    return;
  }

  await Promise.all(adminRows.map((admin) => subscribeMessage.send({
    touser: admin.openId,
    templateId,
    page: `/pages/admin/order-detail/index?id=${order._id}`,
    data: {
      thing1: { value: '新订单待配送' },
      amount2: { value: formatAmountFen(order.payAmountFen) },
      thing3: { value: String(order.receiverAddress || '地址未填写').slice(0, 20) }
    }
  }).catch((error) => console.error('[notice]', admin.openId, error))));
}

function formatAmountFen(amountFen) {
  const amount = Number(amountFen);
  return `${(Number.isFinite(amount) ? amount / 100 : 0).toFixed(2)}元`;
}
