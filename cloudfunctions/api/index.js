const cloud = require('wx-server-sdk');
const { createContext } = require('./lib/context');
const { fail } = require('./lib/response');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const actions = {
  ping: async () => ({ ok: true, data: { pong: true } })
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
    console.error('[api]', action, error);
    return fail('INTERNAL_ERROR', '服务暂时不可用');
  }
};
