App({
  globalData: {
    envId: '',
    userOpenId: ''
  },
  onLaunch() {
    wx.cloud.init({
      traceUser: true
    });
  }
});
