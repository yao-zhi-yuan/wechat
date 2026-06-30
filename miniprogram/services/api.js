export async function callApi(action, data = {}) {
  const result = await wx.cloud.callFunction({
    name: 'api',
    data: { action, data }
  });
  const payload = result.result;
  if (!payload || !payload.ok) {
    const message = payload && payload.error ? payload.error.message : '服务暂时不可用';
    throw new Error(message);
  }
  return payload.data;
}
