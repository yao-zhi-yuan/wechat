const { COLLECTIONS } = require('./db');

async function isAdmin(ctx) {
  const result = await ctx.db.collection(COLLECTIONS.admins)
    .where({ openId: ctx.openId, enabled: true })
    .limit(1)
    .get();
  return result.data.length > 0;
}

async function requireAdmin(ctx) {
  if (!(await isAdmin(ctx))) {
    const error = new Error('需要管理员权限');
    error.code = 'FORBIDDEN';
    throw error;
  }
}

module.exports = { isAdmin, requireAdmin };
