// pages/home/home.js
const app = getApp()

Page({
  data: {
    currentTab: 'group',
    dateList: [],
    selectedDate: '',
    selectedDateIndex: 0,
    searchValue: '',
    currentCategory: '',
    categories: [],
    courseList: [],
    loading: false,
    page: 1,
    hasMore: true,
    // 私教预约相关
    teacherList: [],
    teacherSearchValue: '',
    teacherLoading: false
  },

  onLoad(options) {
    this.generateDateList()
    this.loadCategories()
    this.loadCourses()
  },

  onShow() {
    if (this.data.currentTab === 'group') {
      this.loadCourses()
    } else {
      this.loadTeachers()
    }
  },

  onPullDownRefresh() {
    this.setData({
      page: 1,
      hasMore: true,
      courseList: []
    })
    if (this.data.currentTab === 'group') {
      this.loadCourses()
    } else {
      this.loadTeachers()
    }
    wx.stopPullDownRefresh()
  },

  // 生成日期列表（前后3周，共42天）
  generateDateList() {
    const dateList = []
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const today = new Date()
    today.setHours(0, 0, 0, 0)

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
      selectedDate: dateList[todayIndex].date,
      selectedDateIndex: todayIndex
    })
  },

  // 切换选项卡
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.currentTab) return

    this.setData({ currentTab: tab })

    if (tab === 'private') {
      this.loadTeachers()
    } else {
      this.loadCourses()
    }
  },

  // 选择日期
  selectDate(e) {
    const date = e.currentTarget.dataset.date
    const index = e.currentTarget.dataset.index
    this.setData({
      selectedDate: date,
      selectedDateIndex: index,
      page: 1,
      courseList: []
    })
    if (this.data.currentTab === 'group') {
      this.loadCourses()
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchValue: e.detail.value
    })
  },

  // 搜索
  onSearch() {
    this.setData({
      page: 1,
      courseList: []
    })
    this.loadCourses()
  },

  // 加载筛选分类
  loadCategories() {
    wx.request({
      url: `${app.globalData.apiUrl}/api/filter-categories`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({
            categories: res.data.data || []
          })
        }
      }
    })
  },

  // 分类点击
  onNavClick(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      currentCategory: category,
      page: 1,
      courseList: []
    })
    this.loadCourses()
  },

  // 加载团课列表
  loadCourses() {
    if (this.data.loading) return

    this.setData({ loading: true })

    const requestData = {
      course_type: 'group',
      date: this.data.selectedDate,
      search: this.data.searchValue,
      category_id: this.data.currentCategory
    }

    console.log('===== loadCourses 请求参数 =====', JSON.stringify(requestData))
    console.log('当前用户 openid:', wx.getStorageSync('openid'))
    console.log('当前用户 userId:', wx.getStorageSync('userId'))

    wx.request({
      url: `${app.globalData.apiUrl}/api/teacher-courses`,
      method: 'GET',
      data: requestData,
      success: (res) => {
        console.log('loadCourses 响应状态码:', res.statusCode)
        console.log('loadCourses 响应数据:', JSON.stringify(res.data))
        if (res.data.code === 200) {
          const newList = res.data.data || []
          console.log('课程数量:', newList.length)
          if (newList.length > 0) {
            console.log('第一条课程:', JSON.stringify(newList[0]))
          }
          this.setData({
            courseList: this.data.page === 1 ? newList : this.data.courseList.concat(newList),
            loading: false,
            hasMore: newList.length >= 10
          })
        } else {
          this.setData({ loading: false })
          wx.showToast({
            title: res.data.message || '加载失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        this.setData({ loading: false })
        console.error('loadCourses 失败:', JSON.stringify(err))
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },


  // 加载更多
  loadMore() {
    if (!this.data.hasMore || this.data.loading) return
    this.setData({
      page: this.data.page + 1
    })
    this.loadCourses()
  },

  // ==================== 私教预约相关 ====================

  // 教练搜索输入
  onTeacherSearchInput(e) {
    this.setData({
      teacherSearchValue: e.detail.value
    })
  },

  // 教练搜索
  onTeacherSearch() {
    this.loadTeachers()
  },

  // 加载教练列表
  loadTeachers() {
    this.setData({ teacherLoading: true })

    wx.request({
      url: `${app.globalData.apiUrl}/api/teachers`,
      method: 'GET',
      data: {
        search: this.data.teacherSearchValue
      },
      success: (res) => {
        this.setData({ teacherLoading: false })
        if (res.data.code === 200) {
          this.setData({
            teacherList: res.data.data || []
          })
        }
      },
      fail: () => {
        this.setData({ teacherLoading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
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

  // 查看教练课程
  viewTeacherCourses(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/teacher-detail/teacher-detail?id=${id}&tab=courses`
    })
  },

  // 点击课程
  onCourseClick(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/group-course-detail/group-course-detail?id=${id}`
    })
  },

  // 查看教练
  viewTeacher(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/teacher-detail/teacher-detail?id=${id}`
    })
  }
})
