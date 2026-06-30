const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const db = cloud.database();
  const outRefundNo = event.outRefundNo || event.out_refund_no;
  const refundId = event.refundId || event.refund_id;
  const rows = await db.collection('refunds').where({ outRefundNo }).limit(1).get();
  if (!rows.data.length) {
    return { errcode: 0, errmsg: 'ok' };
  }

  const refund = rows.data[0];
  if (refund.status === 'success') {
    return { errcode: 0, errmsg: 'ok' };
  }

  const now = new Date();
  await db.collection('refunds').doc(refund._id).update({
    data: {
      status: 'success',
      refundId,
      callbackReceivedAt: now,
      callbackSummary: event,
      updatedAt: now
    }
  });
  await db.collection('orders').doc(refund.orderId).update({
    data: {
      status: 'refunded',
      payStatus: 'refunded',
      refundStatus: 'success',
      updatedAt: new Date()
    }
  });
  return { errcode: 0, errmsg: 'ok' };
};
