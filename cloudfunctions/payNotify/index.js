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
