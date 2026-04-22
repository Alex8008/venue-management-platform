const api = require('../../utils/api')
const app = getApp()


Page({
  data: {
    userId: 0,
    userName: '',
    userProfile: {},
    teacherCourses: [],
    historyActivities: [],
    historyCourses: [],
    historyOrders: []
  },


  onLoad(options) {
    const userId = parseInt(options.id)
    const userName = options.name || '用户'
    this.setData({ userId, userName })
    this.loadUserDetail()
  },


  onPullDownRefresh() {
    this.loadUserDetail()
    wx.stopPullDownRefresh()
  },


  async loadUserDetail() {
    wx.showLoading({ title: '加载中...' })
    try {
      const result = await api.adminGetUserDetail(this.data.userId)
      if (result.success) {
        const data = result.data


        const activityHistory = (data.activity_history || []).map(item => ({
          ...item,
          title: item.activity_title || item.title || '',
          activity_start: item.activity_start || '',
          total_amount: item.total_amount || 0
        }))


        const courseHistory = (data.course_history || []).map(item => ({
          ...item,
          title: item.course_title || item.title || '',
          course_type: item.course_type || '',
          schedule_date: item.schedule_date || '',
          start_time: item.start_time || '',
          teacher_name: item.teacher_name || '',
          payment_amount: item.payment_amount || 0
        }))


        const orderHistory = (data.order_history || []).map(item => ({
          ...item,
          product_name: item.product_name || ('订单#' + item.id),
          total_amount: item.total_amount || 0
        }))


        this.setData({
          userProfile: data,
          historyActivities: activityHistory,
          historyCourses: courseHistory,
          historyOrders: orderHistory
        })


        if (data.user_type === 'teacher') {
          this.loadTeacherCourses()
        }
      }
      wx.hideLoading()
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },


  loadTeacherCourses() {
    wx.request({
      url: `${app.globalData.apiUrl}/api/teacher-courses`,
      method: 'GET',
      data: { teacher_id: this.data.userId },
      header: this.getAuthHeader(),
      success: (res) => {
        if (res.data.success) {
          this.setData({ teacherCourses: res.data.data || [] })
        }
      }
    })
  },


  getAuthHeader() {
    const header = { 'Content-Type': 'application/json' }
    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    if (openid) { header['OpenId'] = openid }
    else if (userId) { header['User-Id'] = userId }
    return header
  },


  onTeacherCourseClick(e) {
    const id = e.currentTarget.dataset.id
    const courseType = e.currentTarget.dataset.type
    if (courseType === 'group') {
      wx.navigateTo({ url: `/pages/group-course-detail/group-course-detail?id=${id}` })
    } else {
      wx.navigateTo({ url: `/pages/teacher-course-detail/teacher-course-detail?id=${id}` })
    }
  },


  onActivityClick(e) {
    const activityId = e.currentTarget.dataset.id
    if (activityId) {
      wx.navigateTo({ url: `/pages/activity-detail/activity-detail?id=${activityId}` })
    }
  },


  onCourseClick(e) {
    const courseId = e.currentTarget.dataset.id
    const courseType = e.currentTarget.dataset.type
    if (!courseId) return
    if (courseType === 'group') {
      wx.navigateTo({ url: `/pages/group-course-detail/group-course-detail?id=${courseId}` })
    } else {
      wx.navigateTo({ url: `/pages/teacher-course-detail/teacher-course-detail?id=${courseId}` })
    }
  },


  onOrderClick(e) {
    const orderId = e.currentTarget.dataset.id
    if (orderId) {
      wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${orderId}` })
    }
  },


  onMembershipCardClick(e) {
    const cardId = e.currentTarget.dataset.cardId
    if (cardId) {
      wx.navigateTo({ url: `/pages/membership-card-detail/membership-card-detail?id=${cardId}` })
    }
  },


  onChangeUserType(e) {
    const newType = e.currentTarget.dataset.type
    const currentType = this.data.userProfile.user_type
    if (newType === currentType) return


    const typeText = newType === 'admin' ? '管理员' : newType === 'teacher' ? '教练' : '普通用户'


    wx.showModal({
      title: '确认修改用户类型',
      content: `确定要将该用户设置为${typeText}吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '修改中...' })
            const result = await api.adminUpdateUserType(this.data.userId, newType)
            wx.hideLoading()
            if (result.success) {
              wx.showToast({ title: '修改成功', icon: 'success' })
              this.loadUserDetail()
            } else {
              wx.showToast({ title: result.message || '修改失败', icon: 'none' })
            }
          } catch (error) {
            wx.hideLoading()
            wx.showToast({ title: '网络错误', icon: 'none' })
          }
        }
      }
    })
  }
})
