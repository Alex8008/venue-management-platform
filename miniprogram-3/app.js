var envConfig = require('./config/env')

App({
  globalData: {
    userInfo: null,
    baseUrl: envConfig.baseUrl,
    apiUrl: envConfig.baseUrl
  },

  onLaunch() {
    this.checkUserLogin()
  },

  checkUserLogin() {
    var userId = wx.getStorageSync('userId')
    if (!userId) {
      console.log('用户未登录')
    }
  }
})
