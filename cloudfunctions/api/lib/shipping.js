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
      item_desc: (order.items || []).map((item) => `${item.name}x${item.quantity}`).join('，'),
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
