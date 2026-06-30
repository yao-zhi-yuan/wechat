const { COLLECTIONS } = require('./db');
const { ok } = require('./response');

async function getShopConfig(data, ctx) {
  const result = await ctx.db.collection(COLLECTIONS.shopConfig).doc('default').get();
  return ok(result.data);
}

async function getSession(data, ctx) {
  return ok({
    openId: ctx.openId,
    appId: ctx.appId
  });
}

module.exports = { getShopConfig, getSession };
