import { formatFen } from '../../utils/money';
import { orderStatusLabel } from '../../utils/status';

export function buildOrderListViewModels(orders) {
  return orders.map((order) => ({
    ...order,
    statusText: orderStatusLabel(order.status),
    amountText: formatFen(order.payAmountFen)
  }));
}
