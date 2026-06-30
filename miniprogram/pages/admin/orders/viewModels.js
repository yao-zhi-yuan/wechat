import { formatFen } from '../../../utils/money';
import { orderStatusLabel } from '../../../utils/status';

export function buildAdminOrderViewModels(orders) {
  return orders.map((order) => ({
    ...order,
    amountText: formatFen(order.payAmountFen || 0),
    statusText: orderStatusLabel(order.status),
    receiverText: [order.receiverName, order.receiverPhone].filter(Boolean).join(' '),
    shippingStatusText: shippingStatusLabel(order.wechatShippingUploadStatus)
  }));
}

export function shippingStatusLabel(status) {
  const labels = {
    pending: '待同步',
    uploaded: '已同步',
    failed: '同步失败'
  };
  return labels[status] || '待同步';
}
