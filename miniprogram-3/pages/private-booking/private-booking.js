// pages/private-booking/private-booking.js
const app = getApp()

Page({
  data: {
    currentTab: 'private',
    dateList: [],
    selectedDate: '',
    searchKeyword: '',
    teacherList: [],
    loading: false
  },

  onLoad(options) {
    this.generateDateList()
    this.loadTeachers()
  },

  onPullDownRefresh() {
    this.loadTeachers()
    wx.stopPullDownRefresh()
  },

  // 生成日期列表（前后3周，共42天）
  generateDateList() {
    const dateList = []
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

    let todayIndex = 0

    for (let i = -21; i <= 20; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)

      const month = date.getMonth() + 1
      const day = date.getDate()
      const week = weekDays[date.getDay()]
      const dateStr = `${date.getFullYear()}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`

      if (i === 0) {
        todayIndex = dateList.length
      }

      dateList.push({
        date: dateStr,
        day: i === 0 ? '今日' : `${month}/${day}`,
        week: week
      })
    }

    this.setData({
      dateList: dateList,
      selectedDate: dateList[todayIndex].date
    })
  },

  // 切换选项卡
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      currentTab: tab
    })

    if (tab === 'group') {
      // 跳转回课程预约页面的团课
      wx.switchTab({
        url: '/pages/home/home'
      })
    }
  },

  // 选择日期
  selectDate(e) {
    const date = e.currentTarget.dataset.date
    this.setData({
      selectedDate: date
    })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    })
    this.loadTeachers()
  },

  // 加载教练列表
  loadTeachers() {
    this.setData({ loading: true })

    wx.request({
      url: `${app.globalData.apiUrl}/api/teachers`,
      method: 'GET',
      data: {
        search: this.data.searchKeyword
      },
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({
            teacherList: res.data.data || [],
            loading: false
          })
        } else {
          wx.showToast({
            title: res.data.message || '加载失败',
            icon: 'none'
          })
          this.setData({ loading: false })
        }
      },
      fail: (err) => {
        console.error('加载教练失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
        this.setData({ loading: false })
      }
    })
  },

  // 查看教练详情
  viewTeacherDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/teacher-detail/teacher-detail?id=${id}`
    })
  },

  // 查看所授课程
  viewCourses(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/teacher-detail/teacher-detail?id=${id}&tab=courses`
    })
  }
})
