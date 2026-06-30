const cloud = require('wx-server-sdk');
const { createContext } = require('./lib/context');
const { fail } = require('./lib/response');
const { createOrder } = require('./lib/orders');
const { listProducts } = require('./lib/products');
const { getShopConfig, getSession } = require('./lib/shop');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const APPLICATION_ERROR_CODES = new Set(['FORBIDDEN', 'VALIDATION_ERROR']);

const actions = {
  ping: async () => ({ ok: true, data: { pong: true } }),
  getShopConfig,
  getSession,
  listProducts,
  createOrder
};

exports.main = async (event) => {
  const action = event && event.action;
  const handler = Object.prototype.hasOwnProperty.call(actions, action)
    ? actions[action]
    : undefined;
  if (typeof handler !== 'function') {
    return fail('UNKNOWN_ACTION', '未知操作');
  }

  try {
    const ctx = createContext(cloud, event);
    return await handler(event.data || {}, ctx);
  } catch (error) {
    if (isApplicationError(error)) {
      return fail(error.code, error.message);
    }
    console.error('[api]', action, error);
    return fail('INTERNAL_ERROR', '服务暂时不可用');
  }
};

function isApplicationError(error) {
  return Boolean(
    error
    && APPLICATION_ERROR_CODES.has(error.code)
    && typeof error.message === 'string'
  );
}
