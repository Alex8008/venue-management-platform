const api = require('../../utils/api')

Page({
  data: {
    courseId: null,
    course: {},
    participants: [],
    total: 0,
    loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ courseId: options.id })
      this.loadParticipants()
    }
  },

  onShow() {
    if (this.data.courseId) {
      this.loadParticipants()
    }
  },

  async loadParticipants() {
    this.setData({ loading: true })
    try {
      wx.showLoading({ title: '加载中...' })
      const result = await api.getCourseParticipants(this.data.courseId)
      wx.hideLoading()
      if (result.success) {
        this.setData({
          course: result.data.course || {},
          participants: result.data.participants || [],
          total: result.data.total || 0,
          loading: false
        })
      } else {
        this.setData({ loading: false })
        wx.showToast({ title: result.message || '加载失败', icon: 'none' })
      }
    } catch (error) {
      wx.hideLoading()
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onPullDownRefresh() {
    this.loadParticipants().then(() => wx.stopPullDownRefresh())
  },

  // 和活动管理的 activity-participants 保持一致：直接跳转用户详情
  onParticipantClick(e) {
    const userId = e.currentTarget.dataset.userId
    const userName = e.currentTarget.dataset.userName
    wx.navigateTo({
      url: `/pages/user-detail/user-detail?id=${userId}&name=${encodeURIComponent(userName)}`
    })
  }
})
