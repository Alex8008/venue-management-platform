// pages/membership-cards/membership-cards.js
const app = getApp()

Page({
  data: {
    teacherId: null,
    cardList: []
  },

  onLoad(options) {
    if (options.teacherId) {
      this.setData({ teacherId: options.teacherId })
    }
    this.loadCards()
  },

  loadCards() {
    wx.showLoading({ title: '加载中...' })

    const params = {}
    if (this.data.teacherId) {
      params.teacher_id = this.data.teacherId
    }

    wx.request({
      url: `${app.globalData.apiUrl}/api/membership-cards`,
      method: 'GET',
      data: params,
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          this.setData({
            cardList: res.data.data || []
          })
        } else {
          wx.showToast({
            title: res.data.message || '加载失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('加载会员卡失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  viewCardDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/membership-card-detail/membership-card-detail?id=${id}&teacherId=${this.data.teacherId || ''}`
    })
  }
})
