export function formatFen(valueFen) {
  assertNonNegativeInteger(valueFen, 'valueFen');
  return `¥${(valueFen / 100).toFixed(2)}`;
}

export function multiplyPrice(priceFen, quantity) {
  assertNonNegativeInteger(priceFen, 'priceFen');
  assertPositiveInteger(quantity, 'quantity');
  return priceFen * quantity;
}

export function sumOrderItems(items) {
  return items.reduce((total, item) => total + multiplyPrice(item.priceFen, item.quantity), 0);
}

function assertNonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
}

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}
