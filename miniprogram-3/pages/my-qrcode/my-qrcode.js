const api = require('../../utils/api')


Page({
  data: {
    qrImageUrl: '',
    userName: '',
    avatarUrl: '',
    countdown: 0,
    expiresAt: 0
  },


  _timer: null,


  onLoad() {
    this.loadQrcode()
  },


  onUnload() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },


  async loadQrcode() {
    try {
      wx.showLoading({ title: '生成中...' })
      const result = await api.getQrcodeData()
      wx.hideLoading()


      if (result.success) {
        const data = result.data
        this.setData({
          qrImageUrl: data.qr_image_url,
          userName: data.user_name,
          avatarUrl: data.avatar_url,
          expiresAt: data.expires_at
        })
        this.startCountdown(data.expires_at)
      } else {
        wx.showToast({ title: result.message || '生成失败', icon: 'none' })
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },

  onPullDownRefresh() {
    this.loadQrcode()
    wx.stopPullDownRefresh()
  },


  startCountdown(expiresAt) {
    if (this._timer) {
      clearInterval(this._timer)
    }


    const update = () => {
      const remaining = expiresAt - Math.floor(Date.now() / 1000)
      this.setData({ countdown: remaining > 0 ? remaining : 0 })


      if (remaining <= 0) {
        clearInterval(this._timer)
        this._timer = null
      }
    }


    update()
    this._timer = setInterval(update, 1000)
  }
})
