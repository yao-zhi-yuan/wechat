const LABELS = {
  pending_payment: '待支付',
  paid_waiting_delivery: '已支付/待配送',
  delivering: '配送中',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款',
};

const TRANSITIONS = {
  pending_payment: ['paid_waiting_delivery', 'cancelled'],
  paid_waiting_delivery: ['delivering', 'refunding'],
  delivering: ['completed', 'refunding'],
  completed: [],
  cancelled: [],
  refunding: ['refunded'],
  refunded: [],
};

export function orderStatusLabel(status) {
  return LABELS[status] || status;
}

export function canTransitionOrder(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}
