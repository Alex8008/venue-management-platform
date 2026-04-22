// pages/teacher-detail/teacher-detail.js
const app = getApp()

Page({
  data: {
    teacherId: null,
    teacher: {},
    privateCourses: [],
    groupCourses: [],
    totalLessons: 0,
    isCollected: false,
    dateList: [],
    selectedDate: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ teacherId: options.id })
      this.generateDateList()
      this.loadTeacherDetail()
    }
  },

  // 生成日期列表
  generateDateList() {
    const dateList = []
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      const month = date.getMonth() + 1
      const day = date.getDate()
      const week = weekDays[date.getDay()]
      const dateStr = `${date.getFullYear()}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`

      dateList.push({
        date: dateStr,
        day: i === 0 ? '今日' : day,
        week: week
      })
    }

    this.setData({
      dateList: dateList,
      selectedDate: dateList[0].date
    })
  },

  // 加载教练详情
  loadTeacherDetail() {
    wx.showLoading({ title: '加载中...' })

    wx.request({
      url: `${app.globalData.apiUrl}/api/teachers/${this.data.teacherId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          const data = res.data.data
          this.setData({
            teacher: data.teacher || {},
            privateCourses: data.private_courses || [],
            groupCourses: data.group_courses || [],
            totalLessons: data.total_lessons || 0
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
        console.error('加载教练详情失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  // 选择日期
  selectDate(e) {
    const date = e.currentTarget.dataset.date
    this.setData({ selectedDate: date })
    // TODO: 加载该日期的团课
  },

  // 收藏/取消收藏
  toggleCollect() {
    this.setData({
      isCollected: !this.data.isCollected
    })
    wx.showToast({
      title: this.data.isCollected ? '已收藏' : '已取消收藏',
      icon: 'success'
    })
  },

  // 查看课程详情
  viewCourseDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/teacher-course-detail/teacher-course-detail?id=${id}`
    })
  },

  onPullDownRefresh() {
    this.loadTeacherDetail()
    wx.stopPullDownRefresh()
  },

  // 查看团课详情
  viewGroupCourseDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/group-course-detail/group-course-detail?id=${id}`
    })
  }
})
