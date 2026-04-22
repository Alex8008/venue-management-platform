const app = getApp()
const { triggerPayment } = require('../../utils/payment')

Page({
  data: {
    bookings: [],
    currentStatus: '',
    loading: false,
    tabs: [
      { label: '全部', status: '' },
      { label: '已通过', status: 'approved' },
      { label: '已取消', status: 'cancelled' },
      { label: '未通过', status: 'rejected' }
    ]
  },

  _loaded: false,

  onLoad() { this.loadBookings() },
  onShow() { if (this._loaded) { this.loadBookings() } this._loaded = true },

  onTabClick(e) {
    this.setData({ currentStatus: e.currentTarget.dataset.status })
    this.loadBookings()
  },

  loadBookings() {
    this.setData({ loading: true })
    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }

    wx.request({
      url: `${app.globalData.apiUrl}/api/course-bookings`,
      method: 'GET',
      header,
      data: { status: this.data.currentStatus },
      success: (res) => {
        if (res.data.code === 200) {
          const data = res.data.data
          this.setData({ bookings: (data && data.list) || [], loading: false })
        } else {
          this.setData({ loading: false })
        }
      },
      fail: () => { this.setData({ loading: false }) }
    })
  },

  async onPayBooking(e) {
    const bookingId = e.currentTarget.dataset.id
    const amount = parseFloat(e.currentTarget.dataset.amount)
    try {
      const payResult = await triggerPayment('course', bookingId, amount)
      if (payResult.success) {
        wx.showToast({ title: '支付成功', icon: 'success' })
        this.loadBookings()
      } else if (payResult.cancelled) {
        wx.showToast({ title: '已取消支付', icon: 'none' })
      }
    } catch (error) {
      wx.showModal({ title: '支付异常', content: String(error.message || '未知错误'), showCancel: false })
    }
  },

  onCancelBooking(e) {
    const bookingId = e.currentTarget.dataset.id
    wx.showModal({
      title: '取消预约',
      content: '确认取消此预约吗？取消后可重新预约。',
      success: (res) => {
        if (res.confirm) {
          const openid = wx.getStorageSync('openid')
          const userId = wx.getStorageSync('userId')
          const header = { 'Content-Type': 'application/json' }
          if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }
          wx.showLoading({ title: '取消中...' })
          wx.request({
            url: `${app.globalData.apiUrl}/api/course-bookings/${bookingId}/cancel`,
            method: 'PUT',
            header,
            success: (res) => {
              wx.hideLoading()
              if (res.data.code === 200) {
                wx.showToast({ title: '已取消', icon: 'success' })
                this.loadBookings()
              } else {
                wx.showToast({ title: res.data.message || '取消失败', icon: 'none' })
              }
            },
            fail: () => { wx.hideLoading(); wx.showToast({ title: '网络错误', icon: 'none' }) }
          })
        }
      }
    })
  },


  onViewDetail(e) {
    const bookingId = e.currentTarget.dataset.id
    const booking = this.data.bookings.find(b => b.id === bookingId)
    if (!booking) return
    if (booking.course_type === 'group') {
      wx.navigateTo({ url: `/pages/group-course-detail/group-course-detail?id=${booking.course_id}` })
    } else {
      wx.navigateTo({ url: `/pages/teacher-course-detail/teacher-course-detail?id=${booking.course_id}` })
    }
  },

  onBookCourse() { wx.switchTab({ url: '/pages/home/home' }) }
})
