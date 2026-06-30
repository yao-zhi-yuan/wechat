import { formatFen } from '../../../utils/money';
import { orderStatusLabel } from '../../../utils/status';
import { shippingStatusLabel } from '../orders/viewModels';

export function buildAdminOrderDetailViewModel(order) {
  return {
    ...order,
    amountText: formatFen(order.payAmountFen || 0),
    statusText: orderStatusLabel(order.status),
    shippingStatusText: shippingStatusLabel(order.wechatShippingUploadStatus),
    shippingHelpText: order.wechatShippingUploadStatus === 'failed'
      ? '发货信息同步失败，请在微信小程序后台手工补录发货信息。'
      : '',
    canStartDelivery: order.status === 'paid_waiting_delivery',
    canComplete: order.status === 'delivering',
    items: (order.items || []).map((item) => ({
      ...item,
      priceText: formatFen(item.priceFen || 0),
      subtotalText: formatFen(item.subtotalFen || 0)
    }))
  };
}
