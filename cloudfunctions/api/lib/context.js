function createContext(cloud, event) {
  const wxContext = cloud.getWXContext();
  return {
    cloud,
    db: cloud.database(),
    openId: wxContext.OPENID,
    appId: wxContext.APPID,
    rawEvent: event
  };
}

module.exports = { createContext };
