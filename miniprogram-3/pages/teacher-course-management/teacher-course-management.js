const api = require('../../utils/api')

Page({
  data: {
    courses: [],
    allCourses: [],
    courseSearchValue: ''
  },

  onLoad() {
    this.loadCourses()
  },

  onShow() {
    this.loadCourses()
  },

  async loadCourses() {
    try {
      const result = await api.getTeacherCourses({ show_all: 1 })
      if (result.success) {
        this.setData({
          courses: result.data || [],
          allCourses: result.data || []
        })
      }
    } catch (error) {
      console.error('加载课程列表失败:', error)
    }
  },

  onCourseSearchInput(e) {
    this.setData({
      courseSearchValue: e.detail.value
    })
  },

  onCourseSearch() {
    const searchValue = this.data.courseSearchValue.toLowerCase()

    if (!searchValue) {
      this.setData({
        courses: this.data.allCourses
      })
      return
    }

    const filtered = this.data.allCourses.filter(course =>
      course.title && course.title.toLowerCase().includes(searchValue)
    )

    this.setData({
      courses: filtered
    })
  },

  onCreateCourse() {
    wx.navigateTo({
      url: '/pages/teacher-course-edit/teacher-course-edit'
    })
  },

  onEditCourse(e) {
    const courseId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/teacher-course-edit/teacher-course-edit?id=${courseId}`
    })
  },

  onViewCourseParticipants(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/course-participants/course-participants?id=${id}`
    })
  },

  onDeleteCourse(e) {
    const courseId = e.currentTarget.dataset.id
    const courseName = e.currentTarget.dataset.name

    wx.showModal({
      title: '⚠️ 危险操作',
      content: `确认删除课程「${courseName}」？\n\n此操作将同时删除：\n• 所有预约记录\n• 课程时间表\n\n删除后无法恢复！`,
      confirmText: '确认删除',
      cancelText: '取消',
      confirmColor: '#f44336',
      success: async (res) => {
        if (!res.confirm) return

        wx.showModal({
          title: '最终确认',
          content: '您确定要永久删除此课程吗？',
          confirmText: '永久删除',
          cancelText: '取消',
          confirmColor: '#f44336',
          success: async (res2) => {
            if (!res2.confirm) return

            try {
              wx.showLoading({ title: '删除中...' })
              const result = await api.deleteTeacherCourse(courseId)
              wx.hideLoading()

              if (result.success) {
                wx.showToast({ title: '删除成功', icon: 'success' })
                this.loadCourses()
              } else {
                wx.showToast({ title: result.message || '删除失败', icon: 'none' })
              }
            } catch (error) {
              wx.hideLoading()
              wx.showToast({ title: '网络错误', icon: 'none' })
            }
          }
        })
      }
    })
  },


  onManageCourseFilters() {
    wx.navigateTo({
      url: '/pages/admin-filter-management/admin-filter-management'
    })
  },

  onPullDownRefresh() {
    this.loadCourses().then(() => wx.stopPullDownRefresh())
  }
})
