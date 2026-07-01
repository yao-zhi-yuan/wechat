App({
  globalData: {
    envId: 'cloud1-d8g5p1ynefb5a2e03',
    userOpenId: ''
  },
  onLaunch() {
    wx.cloud.init({
      env: 'cloud1-d8g5p1ynefb5a2e03',
      traceUser: true
    });
  }
});
