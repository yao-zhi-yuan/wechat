export function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || ''));
}

export function normalizeQuantity(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  if (parsed > 99) return 99;
  return parsed;
}

export function validateReceiver(receiver) {
  if (!receiver || !String(receiver.name || '').trim()) return { valid: false, message: '请填写收货人' };
  if (!isValidPhone(receiver.phone)) return { valid: false, message: '请填写正确手机号' };
  if (!String(receiver.address || '').trim()) return { valid: false, message: '请填写收货地址' };
  return { valid: true };
}
