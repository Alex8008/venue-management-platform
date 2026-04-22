const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    isEdit: false,
    cardId: null,
    saving: false,
    teachers: [],
    form: {
      card_name: '',
      card_type: 'times',
      times_count: '',
      valid_days: '',
      validity_start: '',
      validity_end: '',
      price: '',
      card_image: '',
      description: '',
      purchase_notes: '',
      applicable_stores: ''
    }
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ isEdit: true, cardId: parseInt(options.id) })
      wx.setNavigationBarTitle({ title: '编辑会员卡' })
      this.loadTeachers(() => { this.loadCardDetail() })
    } else {
      wx.setNavigationBarTitle({ title: '新建会员卡' })
      this.loadTeachers()
    }
  },

  loadTeachers(callback) {
    wx.request({
      url: `${app.globalData.apiUrl}/api/teachers`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          // ★ 修复：使用 real_name 或 name 字段显示真实姓名
          const teachers = (res.data.data || []).map(t => ({
            ...t,
            id: Number(t.id),
            // teachers 接口返回 name 字段（即 real_name）
            display_name: t.name || t.real_name || `教练${t.id}`,
            selected: false
          }))
          this.setData({ teachers })
        }
        if (callback) callback()
      },
      fail: () => { if (callback) callback() }
    })
  },


  loadCardDetail() {
    wx.showLoading({ title: '加载中...' })
    wx.request({
      url: `${app.globalData.apiUrl}/api/membership-cards/${this.data.cardId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          const card = res.data.data

          // 解析已选教练
          let teacherIds = []
          if (card.teacher_ids) {
            if (Array.isArray(card.teacher_ids)) {
              teacherIds = card.teacher_ids.map(Number)
            } else if (typeof card.teacher_ids === 'string') {
              try { teacherIds = JSON.parse(card.teacher_ids).map(Number) } catch(e) {}
            }
          }

          // 同步教练选中状态
          const teachers = this.data.teachers.map(t => ({
            ...t,
            selected: teacherIds.indexOf(Number(t.id)) > -1
          }))

          this.setData({
            teachers,
            form: {
              card_name:       card.card_name || '',
              card_type:       card.card_type || 'times',
              times_count:     card.times_count ? String(card.times_count) : '',
              valid_days:      card.valid_days ? String(card.valid_days) : '',
              validity_start:  card.validity_start || '',
              validity_end:    card.validity_end || '',
              price:           card.price ? String(card.price) : '',
              card_image:      card.card_image || '',
              description:     card.description || '',
              purchase_notes:  card.purchase_notes || '',
              applicable_stores: card.applicable_stores || ''
            }
          })
        } else {
          wx.showToast({ title: '加载失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onSelectType(e) {
    this.setData({ 'form.card_type': e.currentTarget.dataset.type })
  },

  onValidityStartChange(e) {
    this.setData({ 'form.validity_start': e.detail.value })
  },

  onValidityEndChange(e) {
    this.setData({ 'form.validity_end': e.detail.value })
  },

  onToggleTeacher(e) {
    const index = e.currentTarget.dataset.index
    const newVal = !this.data.teachers[index].selected
    this.setData({ [`teachers[${index}].selected`]: newVal })
  },

  async onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        wx.showLoading({ title: '上传中...' })
        try {
          const result = await api.uploadImage(tempFilePath)
          wx.hideLoading()
          if (result.success) {
            this.setData({ 'form.card_image': result.data.image_url })
          } else {
            wx.showToast({ title: '上传失败', icon: 'none' })
          }
        } catch(e) {
          wx.hideLoading()
          wx.showToast({ title: '上传失败', icon: 'none' })
        }
      }
    })
  },

  onSave() {
    const { form, isEdit, cardId } = this.data

    if (!form.card_name.trim()) {
      wx.showToast({ title: '请输入会员卡名称', icon: 'none' })
      return
    }
    if (form.card_type === 'times' && !form.times_count) {
      wx.showToast({ title: '请输入总次数', icon: 'none' })
      return
    }
    if (form.card_type === 'period' && !form.valid_days) {
      wx.showToast({ title: '请输入生效天数', icon: 'none' })
      return
    }
    if (!form.price) {
      wx.showToast({ title: '请输入价格', icon: 'none' })
      return
    }

    const selectedTeacherIds = this.data.teachers.filter(t => t.selected).map(t => t.id)

    const postData = {
      card_name:         form.card_name.trim(),
      card_type:         form.card_type,
      price:             parseFloat(form.price),
      card_image:        form.card_image,
      description:       form.description,
      purchase_notes:    form.purchase_notes,
      applicable_stores: form.applicable_stores,
      teacher_ids:       selectedTeacherIds,
      times_count:       form.card_type === 'times' ? parseInt(form.times_count) : null,
      valid_days:        form.card_type === 'period' ? parseInt(form.valid_days) : null,
      validity_start:    form.card_type === 'period' ? (form.validity_start || null) : null,
      validity_end:      form.card_type === 'period' ? (form.validity_end || null) : null
    }

    this.setData({ saving: true })

    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }

    const url = isEdit
      ? `${app.globalData.apiUrl}/api/membership-cards/${cardId}`
      : `${app.globalData.apiUrl}/api/membership-cards`
    const method = isEdit ? 'PUT' : 'POST'

    wx.request({
      url, method, data: postData, header,
      success: (res) => {
        this.setData({ saving: false })
        if (res.data.code === 200) {
          wx.showToast({ title: isEdit ? '保存成功' : '创建成功', icon: 'success' })
          setTimeout(() => { wx.navigateBack() }, 1500)
        } else {
          wx.showToast({ title: res.data.message || '操作失败', icon: 'none' })
        }
      },
      fail: () => {
        this.setData({ saving: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  }
})
