import { afterEach, describe, expect, it, vi } from 'vitest';

describe('admin dashboard notice subscription', () => {
  afterEach(() => {
    delete globalThis.Page;
    delete globalThis.wx;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('does not enable backend notices when subscription is rejected', async () => {
    const callApi = vi.fn(async (action) => {
      if (action === 'getShopConfig') {
        return { templateIds: { newOrder: 'tmpl-new-order' } };
      }
      return {};
    });
    const page = await loadAdminDashboardPage(callApi);
    globalThis.wx = {
      requestSubscribeMessage: vi.fn(async () => ({ 'tmpl-new-order': 'reject' })),
      showToast: vi.fn()
    };

    await page.enableNotice();

    expect(callApi).toHaveBeenCalledOnce();
    expect(callApi).toHaveBeenCalledWith('getShopConfig');
    expect(globalThis.wx.requestSubscribeMessage).toHaveBeenCalledWith({ tmplIds: ['tmpl-new-order'] });
    expect(globalThis.wx.showToast).toHaveBeenCalledWith({ title: '未获得提醒权限', icon: 'none' });
  });
});

async function loadAdminDashboardPage(callApi) {
  vi.doMock('../miniprogram/services/api.js', () => ({ callApi }));
  let pageOptions;
  globalThis.Page = vi.fn((options) => {
    pageOptions = options;
  });
  await import('../miniprogram/pages/admin/index/index.js');
  return pageOptions;
}
