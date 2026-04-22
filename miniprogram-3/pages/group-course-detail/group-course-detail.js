const api = require('../../utils/api')
const { triggerPayment } = require('../../utils/payment')
const app = getApp()

Page({
  data: {
    courseId: null,
    course: {},
    teacher: {},
    userBooking: null,
    enrollButtonText: '立即报名',
    enrollButtonDisabled: false,
    needPayment: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ courseId: options.id })
      this.loadCourseDetail()
    }
  },

  onShow() {
    if (this.data.courseId) {
      this.checkUserBooking()
    }
  },

  loadCourseDetail() {
    wx.showLoading({ title: '加载中...' })
    wx.request({
      url: `${app.globalData.apiUrl}/api/teacher-courses/${this.data.courseId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          const course = res.data.data
          this.setData({ course })
          if (course.teacher_id) this.loadTeacherInfo(course.teacher_id)
          this.checkUserBooking()
        } else {
          wx.showToast({ title: res.data.message || '加载失败', icon: 'none' })
        }
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '网络错误', icon: 'none' }) }
    })
  },

  loadTeacherInfo(teacherId) {
    wx.request({
      url: `${app.globalData.apiUrl}/api/teachers/${teacherId}`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200 && res.data.data.teacher) {
          this.setData({ teacher: res.data.data.teacher })
        }
      }
    })
  },

  async checkUserBooking() {
    try {
      const openid = wx.getStorageSync('openid')
      const userId = wx.getStorageSync('userId')
      if (!openid && !userId) return

      const result = await api.getUserCourseBookings({ status: '' })
      if (result.success) {
        const list = (result.data && result.data.list) || []
        const booking = list.find(b => String(b.course_id) === String(this.data.courseId))
        this.setData({ userBooking: booking })
        this.updateEnrollButton()
      }
    } catch (error) {
      console.error('检查预约状态失败:', error)
    }
  },

  updateEnrollButton() {
    const { userBooking, course } = this.data


    if (!userBooking) {
      if (course.current_participants >= course.max_participants) {
        this.setData({ enrollButtonText: '已满员', enrollButtonDisabled: true, needPayment: false })
      } else {
        this.setData({ enrollButtonText: '立即报名', enrollButtonDisabled: false, needPayment: false })
      }
      return
    }


    if (userBooking.status === 'pending') {
      this.setData({ enrollButtonText: '待审核', enrollButtonDisabled: true, needPayment: false })
    } else if (userBooking.status === 'approved') {
      // ★ 新增：检查退款状态
      const refundStatus = userBooking.refund_status || ''
      if (refundStatus === 'pending') {
        this.setData({ enrollButtonText: '退款中', enrollButtonDisabled: true, needPayment: false })
      } else if (userBooking.payment_status === 'unpaid' && !userBooking.use_membership) {
        this.setData({ enrollButtonText: '去支付', enrollButtonDisabled: false, needPayment: true })
      } else {
        this.setData({ enrollButtonText: '已报名', enrollButtonDisabled: true, needPayment: false })
      }
    } else if (userBooking.status === 'completed') {
      this.setData({ enrollButtonText: '已完成', enrollButtonDisabled: true, needPayment: false })
    } else if (userBooking.status === 'rejected' || userBooking.status === 'cancelled') {
      // ★ 被拒绝或已取消（包括退款通过后），恢复默认报名状态
      if (course.current_participants >= course.max_participants) {
        this.setData({ enrollButtonText: '已满员', enrollButtonDisabled: true, needPayment: false })
      } else {
        this.setData({ enrollButtonText: '重新报名', enrollButtonDisabled: false, needPayment: false })
      }
    }
  },


  async enrollCourse() {
    if (this.data.enrollButtonDisabled) {
      wx.showToast({ title: this.data.enrollButtonText, icon: 'none' })
      return
    }

    // 待支付：触发支付
    if (this.data.needPayment && this.data.userBooking) {
      try {
        const payResult = await triggerPayment('course', this.data.userBooking.id, parseFloat(this.data.userBooking.payment_amount))
        if (payResult.success) {
          wx.showToast({ title: '支付成功', icon: 'success' })
          this.checkUserBooking()
        } else if (payResult.cancelled) {
          wx.showToast({ title: '已取消支付', icon: 'none' })
        }
      } catch (error) {
        wx.showModal({ title: '支付异常', content: String(error.message || '未知错误'), showCancel: false })
      }
      return
    }

    // 报名逻辑
    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    if (!openid && !userId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    wx.showLoading({ title: '处理中...' })
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }

    wx.request({
      url: `${app.globalData.apiUrl}/api/course-bookings`,
      method: 'POST',
      header,
      data: {
        course_id: this.data.courseId,
        payment_amount: this.data.course.price,
        use_membership: false
      },
      success: async (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          const responseData = res.data.data
          // 免审核且需要支付
          if (responseData.need_payment) {
            try {
              const payResult = await triggerPayment('course', responseData.id, parseFloat(this.data.course.price))
              if (payResult.success) {
                wx.showToast({ title: '支付成功', icon: 'success' })
              } else if (payResult.cancelled) {
                wx.showToast({ title: '报名成功，请稍后支付', icon: 'none' })
              }
            } catch (error) {
              wx.showModal({
                title: '报名成功',
                content: '支付异常：' + String(error.message || '') + '\n\n可在"我的课程预约"中重新支付',
                showCancel: false
              })
            }
          } else {
            wx.showToast({ title: '报名成功，等待审核', icon: 'success' })
          }
          this.checkUserBooking()
        } else {
          wx.showToast({ title: res.data.message || '报名失败', icon: 'none' })
        }
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '网络错误', icon: 'none' }) }
    })
  },

  viewTeacherDetail() {
    if (this.data.course.teacher_id) {
      wx.navigateTo({ url: `/pages/teacher-detail/teacher-detail?id=${this.data.course.teacher_id}` })
    }
  },
  onGoHome() { wx.switchTab({ url: '/pages/home/home' }) },
  onShareAppMessage() {
    return {
      title: this.data.course.title || '课程分享',
      path: `/pages/group-course-detail/group-course-detail?id=${this.data.courseId}`,
      imageUrl: this.data.course.cover_image || ''
    }
  },
  async onConsult() {
    try {
      const result = await api.getConsultInfo()
      if (result.success) {
        wx.showModal({ title: '联系咨询', content: result.data.consult_info || '暂无咨询信息', showCancel: true, confirmText: '知道了', cancelText: '取消' })
      }
    } catch (error) {
      wx.showModal({ title: '联系咨询', content: '获取咨询信息失败', showCancel: false })
    }
  }
})
