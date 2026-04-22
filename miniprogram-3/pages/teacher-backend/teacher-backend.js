const app = getApp()

function getAuthHeader() {
  const header = {}
  const openid = wx.getStorageSync('openid')
  const userId = wx.getStorageSync('userId')

  if (openid) {
    header['OpenId'] = openid
  } else if (userId) {
    header['User-Id'] = userId
  }
  return header
}

Page({
  data: {
    teacherInfo: {},
    pendingBookingsCount: 0,
    todayCoursesCount: 0,
    deliveryOrdersCount: 0
  },

  onLoad() {
    this.loadTeacherInfo()
    this.loadStats()
  },

  onShow() {
    this.loadStats()
  },

  // 加载教练信息
  loadTeacherInfo() {
    wx.request({
      url: `${app.globalData.apiUrl}/api/users/profile`,
      method: 'GET',
      header: getAuthHeader(),
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({
            teacherInfo: res.data.data
          })
        }
      },
      fail: (err) => {
        console.error('加载教练信息失败:', err)
      }
    })
  },

  // 加载统计数据
  loadStats() {
    const header = getAuthHeader()

    // 加载待审核预约数量
    wx.request({
      url: `${app.globalData.apiUrl}/api/course-bookings`,
      method: 'GET',
      header: header,
      data: {
        status: 'pending',
        role: 'teacher'
      },
      success: (res) => {
        if (res.data.code === 200) {
          const data = res.data.data
          this.setData({
            pendingBookingsCount: (data && data.list) ? data.list.length : 0
          })
        }
      }
    })

    // 加载今日课程数量
    const today = new Date().toISOString().split('T')[0]
    wx.request({
      url: `${app.globalData.apiUrl}/api/teacher-courses`,
      method: 'GET',
      header: header,
      data: {
        date: today,
        teacher_id: wx.getStorageSync('userId')
      },
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({
            todayCoursesCount: (res.data.data || []).length
          })
        }
      }
    })

    // 加载配送单数量
    wx.request({
      url: `${app.globalData.apiUrl}/api/delivery-orders`,
      method: 'GET',
      header: header,
      data: {
        status: 'pending'
      },
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({
            deliveryOrdersCount: (res.data.data || []).length
          })
        }
      }
    })
  },

  // 活动管理
  onActivityManagement() {
    wx.navigateTo({
      url: '/pages/teacher-activity-management/teacher-activity-management'
    })
  },

  // 课程管理
  onCourseManagement() {
    wx.navigateTo({
      url: '/pages/teacher-course-management/teacher-course-management'
    })
  },

  // 预约审核
  onBookingReview() {
    wx.navigateTo({
      url: '/pages/teacher-booking-review/teacher-booking-review'
    })
  },

  // 配送单
  onDeliveryOrders() {
    wx.navigateTo({
      url: '/pages/teacher-delivery-orders/teacher-delivery-orders'
    })
  },

  // 个人信息编辑
  onProfileEdit() {
    wx.navigateTo({
      url: '/pages/teacher-profile-edit/teacher-profile-edit'
    })
  },

  onPullDownRefresh() {
    this.loadTeacherInfo()
    this.loadStats()
    wx.stopPullDownRefresh()
  },

  // 新建课程
  onAddCourse() {
    wx.navigateTo({
      url: '/pages/teacher-course-edit/teacher-course-edit'
    })
  },
    // 扫码核销
    onScanConsume() {
      wx.scanCode({
        onlyFromCamera: false,
        scanType: ['qrCode'],
        success: (res) => {
          const qrContent = res.result
          wx.navigateTo({
            url: `/pages/scan-consume/scan-consume?qr=${encodeURIComponent(qrContent)}`
          })
        },
        fail: () => {
          wx.showToast({ title: '扫码取消', icon: 'none' })
        }
      })
    },
  
})
