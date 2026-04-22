const app = getApp()
const { triggerPayment } = require('../../utils/payment')

Page({
  data: {
    courseId: null,
    slotId: null,
    selectedDate: '',
    course: {},
    slot: {},
    loading: true,
    submitting: false,
    payMethod: 'direct',
    hasMembershipCard: false,
    membershipCard: null
  },

  onLoad(options) {
    this.setData({
      courseId: options.courseId,
      slotId: options.slotId || '',
      selectedDate: options.date || ''
    })
    this.loadCourseDetail()
  },

  loadCourseDetail() {
    wx.request({
      url: `${app.globalData.apiUrl}/api/teacher-courses/${this.data.courseId}`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          const course = res.data.data
          this.setData({ course, loading: false })
          if (this.data.slotId) this.loadSlotDetail()
          this.checkMembershipCard()
        } else {
          this.setData({ loading: false })
          wx.showToast({ title: '加载失败', icon: 'none' })
        }
      },
      fail: () => { this.setData({ loading: false }); wx.showToast({ title: '网络错误', icon: 'none' }) }
    })
  },

  loadSlotDetail() {
    wx.request({
      url: `${app.globalData.apiUrl}/api/teacher-courses/${this.data.courseId}/available-times`,
      method: 'GET',
      data: { date: this.data.selectedDate },
      success: (res) => {
        if (res.data.code === 200) {
          const slots = res.data.data || []
          const targetSlot = slots.find(s => String(s.id) === String(this.data.slotId))
          if (targetSlot) this.setData({ slot: targetSlot })
        }
      }
    })
  },

  checkMembershipCard() {
    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const header = {}
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }
    const teacherId = this.data.course.teacher_id
    if (!teacherId) return

    wx.request({
      url: `${app.globalData.apiUrl}/api/user-membership-cards/check`,
      method: 'GET',
      header,
      data: { teacher_id: teacherId },
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          const result = res.data.data
          if (result.has_card && result.card) {
            this.setData({ hasMembershipCard: true, membershipCard: result.card, payMethod: 'membership' })
          }
        }
      }
    })
  },

  onSelectPayMethod(e) {
    const method = e.currentTarget.dataset.method
    if (method === 'membership' && !this.data.hasMembershipCard) return
    this.setData({ payMethod: method })
  },

  async onConfirmBooking() {
    if (this.data.submitting) return
    this.setData({ submitting: true })

    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }

    const bookingData = {
      course_id: parseInt(this.data.courseId),
      schedule_id: this.data.slotId ? parseInt(this.data.slotId) : null,
      payment_amount: this.data.payMethod === 'membership' ? 0 : parseFloat(this.data.course.price || 0),
      use_membership: this.data.payMethod === 'membership',
      membership_card_id: this.data.payMethod === 'membership' && this.data.membershipCard ? this.data.membershipCard.id : null
    }

    wx.request({
      url: `${app.globalData.apiUrl}/api/course-bookings`,
      method: 'POST',
      data: bookingData,
      header,
      success: async (res) => {
        this.setData({ submitting: false })
        if (res.data.code === 200) {
          const responseData = res.data.data

          // 免审核且需要支付（非会员卡方式）
          if (responseData.need_payment && this.data.payMethod !== 'membership') {
            try {
              const payResult = await triggerPayment('course', responseData.id, parseFloat(this.data.course.price || 0))
              if (payResult.success) {
                wx.showToast({ title: '支付成功', icon: 'success' })
                setTimeout(() => { wx.navigateBack({ delta: 2 }) }, 1500)
              } else if (payResult.cancelled) {
                wx.showModal({
                  title: '预约成功',
                  content: '可在"我的课程预约"中完成支付',
                  showCancel: false,
                  success: () => { wx.navigateBack({ delta: 2 }) }
                })
              }
            } catch (error) {
              wx.showModal({
                title: '预约成功',
                content: '支付异常：' + String(error.message || '') + '\n\n可在"我的课程预约"中重新支付',
                showCancel: false,
                success: () => { wx.navigateBack({ delta: 2 }) }
              })
            }
          } else {
            // 需要审核 或 使用会员卡
            wx.showModal({
              title: '预约成功',
              content: this.data.payMethod === 'membership' ? '已使用会员卡抵扣，等待教练确认。' : '您的课程预约已提交，请等待教练确认。',
              showCancel: false,
              success: () => { wx.navigateBack({ delta: 2 }) }
            })
          }
        } else {
          wx.showToast({ title: res.data.message || '预约失败', icon: 'none' })
        }
      },
      fail: () => { this.setData({ submitting: false }); wx.showToast({ title: '网络错误', icon: 'none' }) }
    })
  }
})
