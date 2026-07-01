const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const db = cloud.database();
  console.log('[platformNotify]', event);
  const orderNo = event && event.merchant_trade_no;
  if (!orderNo) {
    return { errcode: 0, errmsg: 'ok' };
  }

  const rows = await db.collection('orders').where({ orderNo }).limit(1).get();
  if (!rows.data.length) {
    return { errcode: 0, errmsg: 'ok' };
  }

  if (event.Event === 'trade_manage_order_settlement') {
    await db.collection('orders').doc(rows.data[0]._id).update({
      data: {
        wechatShippingUploadStatus: 'uploaded',
        wechatShippingUploadedAt: Object.prototype.hasOwnProperty.call(event, 'shipped_time')
          ? new Date(event.shipped_time * 1000)
          : rows.data[0].wechatShippingUploadedAt,
        updatedAt: new Date()
      }
    });
  }

  return { errcode: 0, errmsg: 'ok' };
};
