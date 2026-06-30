const CHECKOUT_CART_STORAGE_KEY = 'checkoutCart';
const CHECKOUT_CART_URL_LIMIT = 1200;

export function pruneCartForProducts(cart, products) {
  const productIds = new Set(products.map((product) => product._id).filter(Boolean));
  return Object.keys(cart).reduce((nextCart, productId) => {
    if (productIds.has(productId)) {
      nextCart[productId] = cart[productId];
    }
    return nextCart;
  }, {});
}

export function buildCheckoutCartUrl(cart, options = {}) {
  const encodedCart = encodeURIComponent(JSON.stringify(cart));
  const queryUrl = `/pages/checkout/index?cart=${encodedCart}`;
  const maxUrlLength = options.maxUrlLength || CHECKOUT_CART_URL_LIMIT;
  if (queryUrl.length <= maxUrlLength || !options.storage) {
    return queryUrl;
  }

  const storageKey = options.storageKey || CHECKOUT_CART_STORAGE_KEY;
  options.storage.setStorageSync(storageKey, cart);
  return `/pages/checkout/index?cartStorageKey=${encodeURIComponent(storageKey)}`;
}
