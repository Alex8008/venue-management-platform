const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    courseId: null,
    courseData: {
      course_type: 'group',
      title: '',
      description: '',
      cover_image: '',
      price: '',
      duration: '',
      max_participants: '',
      location: '',
      category_id: null,
      registration_start_date: '',
      registration_start_time: '09:00',
      registration_end_date: '',
      registration_end_time: '18:00',
      course_start_date: '',
      course_start_time: '08:00',
      course_end_date: '',
      course_end_time: '18:00',
      cancel_deadline_date: '',
      cancel_deadline_time: '00:00',
      no_review_needed: false
    },
    categories: [],
    selectedCategory: null,
    selectedCategoryIndex: 0,
    teachers: [],
    selectedTeacherIds: []
  },

  onLoad(options) {
    this.loadTeachers()

    if (options.id) {
      this.setData({ courseId: options.id })
      this.loadCategories(() => {
        this.loadCourse(options.id)
      })
    } else {
      this.loadCategories()
      const now = new Date()
      const formatDate = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      this.setData({
        'courseData.registration_start_date': formatDate(now),
        'courseData.registration_end_date': formatDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
        'courseData.course_start_date': formatDate(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)),
        'courseData.course_end_date': formatDate(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)),
        'courseData.cancel_deadline_date': formatDate(new Date(now.getTime() + 13 * 24 * 60 * 60 * 1000))
      })
    }
  },

  // 解析后端返回的日期时间字符串，分离日期和时间
  parseDateTime(dateTimeStr) {
    if (!dateTimeStr) return { date: '', time: '00:00' }
    const str = String(dateTimeStr).trim()
    // 格式：2026-03-21 08:00 或 2026-03-21 08:00:00
    const spaceIdx = str.indexOf(' ')
    if (spaceIdx === -1) {
      return { date: str, time: '00:00' }
    }
    const datePart = str.substring(0, spaceIdx)
    // 取 HH:MM，忽略秒
    const timeFull = str.substring(spaceIdx + 1)
    const timePart = timeFull.length >= 5 ? timeFull.substring(0, 5) : timeFull
    return { date: datePart, time: timePart }
  },

  loadCourse(courseId) {
    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }

    wx.showLoading({ title: '加载中...' })
    wx.request({
      url: `${app.globalData.apiUrl}/api/teacher-courses/${courseId}`,
      method: 'GET',
      header: header,
      success: (res) => {
        wx.hideLoading()
        console.log('===== loadCourse 响应 =====')
        console.log('HTTP状态码:', res.statusCode)
        console.log('响应数据:', JSON.stringify(res.data))
        if (res.data.code === 200) {
          const course = res.data.data
          console.log('课程原始数据:', JSON.stringify(course))
          console.log('course_start:', course.course_start)
          console.log('registration_start:', course.registration_start)

          const regStart  = this.parseDateTime(course.registration_start)
          const regEnd    = this.parseDateTime(course.registration_end)
          const cStart    = this.parseDateTime(course.course_start)
          const cEnd      = this.parseDateTime(course.course_end)
          const cancelDl  = this.parseDateTime(course.cancel_deadline)

          // 注意：只保留需要的字段，避免把后端返回的 teacher_ids JSON字符串等混入
          this.setData({
            courseData: {
              course_type:   course.course_type || 'group',
              title:         course.title || '',
              description:   course.description || '',
              cover_image:   course.cover_image || '',
              price:         course.price != null ? String(course.price) : '',
              duration:      course.duration != null ? String(course.duration) : '',
              max_participants: course.max_participants != null ? String(course.max_participants) : '',
              location:      course.location || '',
              category_id:   course.category_id || null,
              no_review_needed: course.no_review_needed == 1,
              registration_start_date: regStart.date,
              registration_start_time: regStart.time,
              registration_end_date:   regEnd.date,
              registration_end_time:   regEnd.time,
              course_start_date:       cStart.date,
              course_start_time:       cStart.time,
              course_end_date:         cEnd.date,
              course_end_time:         cEnd.time,
              cancel_deadline_date:    cancelDl.date,
              cancel_deadline_time:    cancelDl.time
            }
          })

          // 恢复已选教练
          let teacherIds = []
          if (course.teacher_ids) {
            if (Array.isArray(course.teacher_ids)) {
              teacherIds = course.teacher_ids.map(Number)
            } else if (typeof course.teacher_ids === 'string') {
              try { teacherIds = JSON.parse(course.teacher_ids).map(Number) } catch(e) {}
            }
          }
          if (teacherIds.length > 0) {
            this.setData({ selectedTeacherIds: teacherIds })
            const teachers = this.data.teachers.map(t => ({
              ...t,
              selected: teacherIds.indexOf(Number(t.id)) > -1
            }))
            this.setData({ teachers })
          }

          // 设置选中的分类
          if (course.category_id) {
            const index = this.data.categories.findIndex(c => c.id === course.category_id)
            if (index !== -1) {
              this.setData({
                selectedCategoryIndex: index,
                selectedCategory: this.data.categories[index]
              })
            }
          }
        } else {
          wx.showToast({ title: res.data.message || '加载失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  loadCategories(callback) {
    wx.request({
      url: `${app.globalData.apiUrl}/api/filter-categories`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({ categories: res.data.data || [] })
        }
        if (callback) callback()
      },
      fail: () => { if (callback) callback() }
    })
  },

  onTypeSelect(e) {
    this.setData({ 'courseData.course_type': e.currentTarget.dataset.type })
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`courseData.${field}`]: e.detail.value })
  },

  onCategoryChange(e) {
    const index = e.detail.value
    const category = this.data.categories[index]
    this.setData({
      selectedCategoryIndex: index,
      selectedCategory: category,
      'courseData.category_id': category.id
    })
  },

  onDateChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`courseData.${field}_date`]: e.detail.value })
  },

  onTimeChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`courseData.${field}_time`]: e.detail.value })
  },

  onChooseCover() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        wx.showLoading({ title: '上传中...' })
        try {
          const result = await api.uploadImage(res.tempFilePaths[0])
          wx.hideLoading()
          if (result.success) {
            this.setData({ 'courseData.cover_image': result.data.image_url })
            wx.showToast({ title: '上传成功', icon: 'success' })
          } else {
            wx.showToast({ title: result.message || '上传失败', icon: 'none' })
          }
        } catch (err) {
          wx.hideLoading()
          wx.showToast({ title: '上传失败', icon: 'none' })
        }
      }
    })
  },

  async loadTeachers() {
    try {
      const result = await api.getTeachers()
      if (result.success) {
        const selectedIds = this.data.selectedTeacherIds
        const teachers = (result.data || []).map(t => ({
          ...t,
          id: Number(t.id),
          name: t.name || t.real_name || '教练',
          selected: selectedIds.indexOf(Number(t.id)) > -1
        }))
        this.setData({ teachers })
      }
    } catch (err) {
      console.error('加载教练列表失败:', err)
    }
  },

  onTeacherToggle(e) {
    const idx = e.currentTarget.dataset.index
    const newVal = !this.data.teachers[idx].selected
    this.setData({ [`teachers[${idx}].selected`]: newVal })
    const ids = this.data.teachers.filter(t => t.selected).map(t => t.id)
    this.setData({ selectedTeacherIds: ids })
  },

  onToggleNoReview() {
    this.setData({ 'courseData.no_review_needed': !this.data.courseData.no_review_needed })
  },

  onSave() {
    const d = this.data.courseData

    console.log('===== onSave 开始 =====')
    console.log('courseData:', JSON.stringify(d))
    console.log('selectedTeacherIds:', this.data.selectedTeacherIds)
    console.log('courseId:', this.data.courseId)

    if (!d.title) {
      wx.showToast({ title: '请输入课程标题', icon: 'none' })
      return
    }
    if (!d.price) {
      wx.showToast({ title: '请输入价格', icon: 'none' })
      return
    }
    if (!d.duration) {
      wx.showToast({ title: '请输入课程时长', icon: 'none' })
      return
    }
    if (d.course_type === 'group' && !d.max_participants) {
      wx.showToast({ title: '请输入最大人数', icon: 'none' })
      return
    }

    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const method = this.data.courseId ? 'PUT' : 'POST'
    const url = this.data.courseId
      ? `${app.globalData.apiUrl}/api/teacher-courses/${this.data.courseId}`
      : `${app.globalData.apiUrl}/api/teacher-courses`

    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }

    const combineDateTime = (date, time) => {
      if (!date) return null
      return `${date} ${time || '00:00'}:00`
    }

    const submitData = {
      course_type:        d.course_type,
      title:              d.title,
      description:        d.description || '',
      cover_image:        d.cover_image || '',
      price:              parseFloat(d.price) || 0,
      duration:           parseInt(d.duration) || 60,
      max_participants:   parseInt(d.max_participants) || 20,
      location:           d.location || '',
      category_id:        d.category_id || null,
      no_review_needed:   d.no_review_needed ? 1 : 0,
      teacher_ids:        this.data.selectedTeacherIds,
      teacher_id:         this.data.selectedTeacherIds.length > 0 ? this.data.selectedTeacherIds[0] : null,
      registration_start: combineDateTime(d.registration_start_date, d.registration_start_time),
      registration_end:   combineDateTime(d.registration_end_date,   d.registration_end_time),
      course_start:       combineDateTime(d.course_start_date,       d.course_start_time),
      course_end:         combineDateTime(d.course_end_date,         d.course_end_time),
      cancel_deadline:    combineDateTime(d.cancel_deadline_date,    d.cancel_deadline_time)
    }

    console.log('提交数据:', JSON.stringify(submitData))
    console.log('请求URL:', url, '方法:', method)

    wx.showLoading({ title: '保存中...' })
    wx.request({
      url: url,
      method: method,
      header: header,
      data: submitData,
      success: (res) => {
        wx.hideLoading()
        console.log('保存响应:', JSON.stringify(res.data))
        console.log('HTTP状态码:', res.statusCode)
        if (res.data.code === 200) {
          wx.showToast({ title: '保存成功', icon: 'success' })
          setTimeout(() => { wx.navigateBack() }, 1500)
        } else {
          wx.showToast({ title: res.data.message || '保存失败', icon: 'none' })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('请求失败:', JSON.stringify(err))
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  async onSaveAsNew() {
    const d = this.data.courseData

    if (!d.title) {
      wx.showToast({ title: '请输入课程标题', icon: 'none' })
      return
    }
    if (!d.price) {
      wx.showToast({ title: '请输入价格', icon: 'none' })
      return
    }
    if (!d.duration) {
      wx.showToast({ title: '请输入课程时长', icon: 'none' })
      return
    }
    if (d.course_type === 'group' && !d.max_participants) {
      wx.showToast({ title: '请输入最大人数', icon: 'none' })
      return
    }

    // 检查课程名是否重复
    wx.showLoading({ title: '检查中...' })
    try {
      const checkResult = await api.getTeacherCourses({ show_all: 1 })
      if (checkResult.success) {
        const existingTitles = (checkResult.data || []).map(c => c.title)
        if (existingTitles.includes(d.title)) {
          wx.hideLoading()
          wx.showModal({
            title: '课程名重复',
            content: '已存在同名课程，请修改课程标题后再保存',
            showCancel: false
          })
          return
        }
      }
    } catch (err) {
      console.error('检查课程名失败:', err)
    }

    wx.showLoading({ title: '创建中...' })

    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }

    const combineDateTime = (date, time) => {
      if (!date) return null
      return `${date} ${time || '00:00'}:00`
    }

    const submitData = {
      course_type:        d.course_type,
      title:              d.title,
      description:        d.description || '',
      cover_image:        d.cover_image || '',
      price:              parseFloat(d.price) || 0,
      duration:           parseInt(d.duration) || 60,
      max_participants:   parseInt(d.max_participants) || 20,
      location:           d.location || '',
      category_id:        d.category_id || null,
      no_review_needed:   d.no_review_needed ? 1 : 0,
      teacher_ids:        this.data.selectedTeacherIds,
      teacher_id:         this.data.selectedTeacherIds.length > 0 ? this.data.selectedTeacherIds[0] : null,
      registration_start: combineDateTime(d.registration_start_date, d.registration_start_time),
      registration_end:   combineDateTime(d.registration_end_date,   d.registration_end_time),
      course_start:       combineDateTime(d.course_start_date,       d.course_start_time),
      course_end:         combineDateTime(d.course_end_date,         d.course_end_time),
      cancel_deadline:    combineDateTime(d.cancel_deadline_date,    d.cancel_deadline_time)
    }

    // 创建新课程（POST，不带 courseId）
    wx.request({
      url: `${app.globalData.apiUrl}/api/teacher-courses`,
      method: 'POST',
      header: header,
      data: submitData,
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          wx.showToast({ title: '新课程创建成功', icon: 'success' })
          setTimeout(() => { wx.navigateBack() }, 1500)
        } else {
          wx.showToast({ title: res.data.message || '创建失败', icon: 'none' })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('创建新课程失败:', JSON.stringify(err))
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },


  onCancel() {
    wx.navigateBack()
  }
})
