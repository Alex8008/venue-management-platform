// pages/teacher-course-detail/teacher-course-detail.js
const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    courseId: null,
    course: {},
    dateList: [],
    selectedDate: '',
    timeSlots: [],
    selectedSlot: null
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ courseId: options.id })
      this.generateDateList()
      this.loadCourseDetail()
    }
  },

  generateDateList() {
    const dateList = []
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      const month = date.getMonth() + 1
      const day = date.getDate()
      const dateStr = `${date.getFullYear()}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`
      dateList.push({
        date: dateStr,
        day: i === 0 ? '今日' : day,
        week: weekDays[date.getDay()]
      })
    }
    this.setData({
      dateList: dateList,
      selectedDate: dateList[0].date
    })
    this.loadAvailableTimes()
  },

  loadCourseDetail() {
    wx.request({
      url: `${app.globalData.apiUrl}/api/teacher-courses/${this.data.courseId}`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({ course: res.data.data })
        }
      }
    })
  },

  loadAvailableTimes() {
    wx.request({
      url: `${app.globalData.apiUrl}/api/teacher-courses/${this.data.courseId}/available-times`,
      method: 'GET',
      data: { date: this.data.selectedDate },
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({ timeSlots: res.data.data || [] })
        }
      }
    })
  },

  selectDate(e) {
    this.setData({
      selectedDate: e.currentTarget.dataset.date,
      selectedSlot: null
    })
    this.loadAvailableTimes()
  },

  selectTimeSlot(e) {
    const slot = e.currentTarget.dataset.slot
    if (!slot.available) return
    this.setData({ selectedSlot: slot })
  },

  directPurchase() {
    if (!this.data.selectedSlot) {
      wx.showToast({ title: '请选择时间段', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/booking-confirm/booking-confirm?courseId=${this.data.courseId}&slotId=${this.data.selectedSlot.id}&date=${this.data.selectedDate}`
    })
  },

  purchaseMemberCard() {
    wx.navigateTo({
      url: `/pages/membership-cards/membership-cards?teacherId=${this.data.course.teacher_id}`
    })
  },

  onGoHome() {
    wx.switchTab({
      url: '/pages/home/home'
    })
  },

  onShareAppMessage() {
    return {
      title: this.data.course.title || '课程分享',
      path: `/pages/teacher-course-detail/teacher-course-detail?id=${this.data.courseId}`,
      imageUrl: this.data.course.cover_image || ''
    }
  },

  onPullDownRefresh() {
    this.loadCourseDetail()
    this.loadAvailableTimes()
    wx.stopPullDownRefresh()
  },

  async onConsult() {
    try {
      const result = await api.getConsultInfo()
      if (result.success) {
        wx.showModal({
          title: '联系咨询',
          content: result.data.consult_info || '暂无咨询信息',
          showCancel: true,
          confirmText: '知道了',
          cancelText: '取消'
        })
      }
    } catch (error) {
      console.error('获取咨询信息失败:', error)
      wx.showModal({
        title: '联系咨询',
        content: '获取咨询信息失败，请稍后再试',
        showCancel: false
      })
    }
  }
})
