const { requireAdmin } = require('./admins');
const { COLLECTIONS } = require('./db');
const { ok } = require('./response');

async function enableAdminNewOrderNotice(data, ctx) {
  await requireAdmin(ctx);
  await ctx.db.collection(COLLECTIONS.admins).where({ openId: ctx.openId, enabled: true }).update({
    data: { newOrderNoticeEnabled: true, updatedAt: new Date() }
  });
  return ok({ enabled: true });
}

module.exports = { enableAdminNewOrderNotice };
