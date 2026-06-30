export function parseCheckoutCart(query = {}, storage) {
  if (query.cart) {
    return normalizeCart(parseJsonCart(query.cart));
  }

  if (query.cartStorageKey && storage && typeof storage.getStorageSync === 'function') {
    const storageKey = decodeQueryValue(query.cartStorageKey);
    if (!storageKey) {
      return {};
    }
    const cart = storage.getStorageSync(storageKey);
    if (typeof storage.removeStorageSync === 'function') {
      storage.removeStorageSync(storageKey);
    }
    return normalizeCart(cart);
  }

  return {};
}

export function cartToItems(cart) {
  const normalizedCart = normalizeCart(cart);
  return Object.keys(normalizedCart).map((productId) => ({
    productId,
    quantity: normalizedCart[productId]
  }));
}

function parseJsonCart(encodedCart) {
  try {
    return JSON.parse(decodeURIComponent(encodedCart));
  } catch (error) {
    return {};
  }
}

function decodeQueryValue(value) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return '';
  }
}

function normalizeCart(cart) {
  if (!isPlainObject(cart)) {
    return {};
  }
  return Object.keys(cart).reduce((normalized, productId) => {
    const quantity = cart[productId];
    if (productId && Number.isInteger(quantity) && quantity >= 1 && quantity <= 99) {
      normalized[productId] = quantity;
    }
    return normalized;
  }, {});
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
