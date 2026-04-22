const api = require('../../utils/api')

Page({
  data: {
    activityId: 0,
    activity: {
      title: '',
      description: '',
      category: '徒步',
      cover_images: [],
      registration_start_date: '',
      registration_start_time: '09:00',
      registration_end_date: '',
      registration_end_time: '18:00',
      activity_start_date: '',
      activity_start_time: '08:00',
      activity_end_date: '',
      activity_end_time: '18:00',
      cancel_deadline_date: '',
      cancel_deadline_time: '00:00',
      location: '',
      latitude: null,
      longitude: null,
      registration_requirements: '',
      fee_details: '',
      base_fee: 0,
      insurance_fee: 0,
      transport_fee: 0,
      meal_fee: 0,
      max_participants: 50,
      notices: '',
      is_top: false,
      is_carousel: false,
      no_review_needed: false
    },
    categoryOptions: ['徒步', '登山', '攀岩', '攀冰', '绳索', '皮划艇', '浆板', '培训'],
    isEdit: false,
    totalFee: 0,
    uploading: false
  },

  onLoad(options) {
    const activityId = parseInt(options.id)
    if (activityId) {
      this.setData({ 
        activityId,
        isEdit: true
      })
      this.loadActivityDetail()
    } else {
      const now = new Date()
      const formatDate = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      this.setData({
        'activity.registration_start_date': formatDate(now),
        'activity.registration_end_date': formatDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
        'activity.activity_start_date': formatDate(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)),
        'activity.activity_end_date': formatDate(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)),
        'activity.cancel_deadline_date': formatDate(new Date(now.getTime() + 13 * 24 * 60 * 60 * 1000))
      })
      this.calculateTotalFee()
    }
  },

  async loadActivityDetail() {
    try {
      wx.showLoading({ title: '加载中...' })
      const result = await api.getActivityDetail(this.data.activityId)
      
      if (result.success) {
        const activity = result.data
        
        const parseDateTime = (dateTimeStr) => {
          if (!dateTimeStr) return { date: '', time: '00:00' }
          const dt = dateTimeStr.split(' ')
          return {
            date: dt[0] || '',
            time: dt[1] ? dt[1].substring(0, 5) : '00:00'
          }
        }
        
        const regStart = parseDateTime(activity.registration_start)
        const regEnd = parseDateTime(activity.registration_end)
        const actStart = parseDateTime(activity.activity_start)
        const actEnd = parseDateTime(activity.activity_end)
        const cancelDeadline = parseDateTime(activity.cancel_deadline)
        
        this.setData({
          activity: {
            ...activity,
            cover_images: activity.cover_images || [],
            registration_start_date: regStart.date,
            registration_start_time: regStart.time,
            registration_end_date: regEnd.date,
            registration_end_time: regEnd.time,
            activity_start_date: actStart.date,
            activity_start_time: actStart.time,
            activity_end_date: actEnd.date,
            activity_end_time: actEnd.time,
            cancel_deadline_date: cancelDeadline.date,
            cancel_deadline_time: cancelDeadline.time,
            insurance_fee: activity.insurance_fee || 0,
            transport_fee: activity.transport_fee || 0,
            meal_fee: activity.meal_fee || 0,
            is_top: activity.is_top === true || activity.is_top === 1,
            is_carousel: activity.is_carousel === true || activity.is_carousel === 1
          }
        })
        
        this.calculateTotalFee()
      }
      
      wx.hideLoading()
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  calculateTotalFee() {
    const { base_fee, insurance_fee, transport_fee, meal_fee } = this.data.activity
    const totalFee = (parseFloat(base_fee) || 0) + 
                     (parseFloat(insurance_fee) || 0) + 
                     (parseFloat(transport_fee) || 0) + 
                     (parseFloat(meal_fee) || 0)
    this.setData({ totalFee: totalFee.toFixed(2) })
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`activity.${field}`]: value
    })
    
    if (['base_fee', 'insurance_fee', 'transport_fee', 'meal_fee'].includes(field)) {
      this.calculateTotalFee()
    }
  },

  onCategoryChange(e) {
    const category = this.data.categoryOptions[e.detail.value]
    this.setData({
      'activity.category': category
    })
  },

  onDateChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`activity.${field}_date`]: value
    })
  },

  onTimeChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`activity.${field}_time`]: value
    })
  },

  onTopChange(e) {
    const newValue = e.detail.value.length > 0
    this.setData({
      'activity.is_top': newValue
    })
  },

  onCarouselChange(e) {
    const newValue = e.detail.value.length > 0
    this.setData({
      'activity.is_carousel': newValue
    })
  },

  onChooseImage() {
    const currentCount = this.data.activity.cover_images.length
    const remainCount = 5 - currentCount
    
    if (remainCount <= 0) {
      wx.showToast({
        title: '最多上传5张图片',
        icon: 'none'
      })
      return
    }

    if (this.data.uploading) {
      wx.showToast({
        title: '正在上传中...',
        icon: 'none'
      })
      return
    }

    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        this.setData({ uploading: true })
        wx.showLoading({ title: '上传中...', mask: true })
        
        const tempFilePaths = res.tempFilePaths
        const uploadedUrls = []
        
        console.log('===== 开始上传 =====')
        console.log('选择的文件数:', tempFilePaths.length)
        console.log('文件路径:', tempFilePaths)
        
        for (let i = 0; i < tempFilePaths.length; i++) {
          const filePath = tempFilePaths[i]
          console.log(`上传第${i + 1}张: ${filePath}`)
          
          try {
            const uploadResult = await api.uploadImage(filePath)
            
            if (uploadResult.success) {
              console.log(`第${i + 1}张上传成功:`, uploadResult.data.image_url)
              uploadedUrls.push(uploadResult.data.image_url)
            } else {
              console.error(`第${i + 1}张上传失败:`, uploadResult.message)
            }
          } catch (error) {
            console.error(`第${i + 1}张上传异常:`, error)
          }
        }
        
        console.log('===== 上传完成 =====')
        console.log('成功上传数量:', uploadedUrls.length)
        console.log('上传的URLs:', uploadedUrls)
        
        const newCoverImages = [...this.data.activity.cover_images, ...uploadedUrls]
        
        this.setData({
          'activity.cover_images': newCoverImages,
          uploading: false
        })
        
        wx.hideLoading()
        
        if (uploadedUrls.length > 0) {
          wx.showToast({
            title: `成功上传${uploadedUrls.length}张`,
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          })
        }
      }
    })
  },

  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index
    const coverImages = [...this.data.activity.cover_images]
    coverImages.splice(index, 1)
    
    this.setData({
      'activity.cover_images': coverImages
    })
  },

  onChooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        console.log('选择的位置:', res)
        this.setData({
          'activity.location': res.address || res.name,
          'activity.latitude': res.latitude,
          'activity.longitude': res.longitude
        })
      },
      fail: (err) => {
        console.log('选择位置失败:', err)
        if (err.errMsg.indexOf('auth deny') !== -1) {
          wx.showModal({
            title: '提示',
            content: '需要授权位置权限才能使用地图选点功能',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
        }
      }
    })
  },

  onToggleNoReview() {
    this.setData({
      'activity.no_review_needed': !this.data.activity.no_review_needed
    })
  },

  async onSave() {
    const { title, registration_start_date, registration_end_date, 
            activity_start_date, activity_end_date, location, base_fee, max_participants } = this.data.activity
    
    if (!title) { wx.showToast({ title: '请输入活动标题', icon: 'none' }); return }
    if (!registration_start_date || !registration_end_date || !activity_start_date || !activity_end_date) {
      wx.showToast({ title: '请完善时间信息', icon: 'none' }); return
    }
    if (!location) { wx.showToast({ title: '请输入活动地点', icon: 'none' }); return }
    if (this.data.activity.cover_images.length === 0) {
      wx.showToast({ title: '请至少上传一张封面图片', icon: 'none' }); return
    }


    wx.showLoading({ title: '保存中...' })


    try {
      const combineDateTime = (date, time) => {
        if (!date) return null
        return `${date} ${time || '00:00'}:00`
      }
      
      const activityData = {
        title: this.data.activity.title,
        description: this.data.activity.description,
        category: this.data.activity.category,
        cover_images: this.data.activity.cover_images,
        registration_start: combineDateTime(this.data.activity.registration_start_date, this.data.activity.registration_start_time),
        registration_end: combineDateTime(this.data.activity.registration_end_date, this.data.activity.registration_end_time),
        activity_start: combineDateTime(this.data.activity.activity_start_date, this.data.activity.activity_start_time),
        activity_end: combineDateTime(this.data.activity.activity_end_date, this.data.activity.activity_end_time),
        cancel_deadline: this.data.activity.cancel_deadline_date ? combineDateTime(this.data.activity.cancel_deadline_date, this.data.activity.cancel_deadline_time) : null,
        location: this.data.activity.location,
        latitude: this.data.activity.latitude,
        longitude: this.data.activity.longitude,
        registration_requirements: this.data.activity.registration_requirements,
        fee_details: this.data.activity.fee_details,
        base_fee: parseFloat(this.data.activity.base_fee) || 0,
        insurance_fee: parseFloat(this.data.activity.insurance_fee) || 0,
        transport_fee: parseFloat(this.data.activity.transport_fee) || 0,
        meal_fee: parseFloat(this.data.activity.meal_fee) || 0,
        max_participants: parseInt(this.data.activity.max_participants) || 50,
        notices: this.data.activity.notices,
        is_top: this.data.activity.is_top || false,
        is_carousel: this.data.activity.is_carousel || false,
        no_review_needed: this.data.activity.no_review_needed ? 1 : 0,
        status: 'published'
      }


      console.log('===== onSave 提交数据 =====', JSON.stringify(activityData))


      let result
      if (this.data.isEdit) {
        result = await api.adminUpdateActivity(this.data.activityId, activityData)
      } else {
        result = await api.adminCreateActivity(activityData)
      }


      wx.hideLoading()


      if (result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => { wx.navigateBack() }, 1500)
      } else {
        // ★ 修复：显示后端返回的实际错误信息
        console.error('保存失败，后端返回:', JSON.stringify(result))
        wx.showToast({ title: result.message || '保存失败', icon: 'none' })
      }
    } catch (error) {
      // ★ 修复：显示实际错误信息而非固定的"网络错误"
      console.error('===== 保存活动异常 =====')
      console.error('错误对象:', JSON.stringify(error))
      console.error('错误消息:', error.message || error)
      wx.hideLoading()
      const errMsg = (error && error.message) ? error.message : (typeof error === 'string' ? error : '请求失败，请检查网络')
      wx.showToast({ title: errMsg, icon: 'none' })
    }
  },


  async onSaveAsNew() {
    const { title, registration_start_date, registration_end_date, 
            activity_start_date, activity_end_date, location } = this.data.activity
    
    if (!title) { wx.showToast({ title: '请输入活动标题', icon: 'none' }); return }
    if (!registration_start_date || !registration_end_date || !activity_start_date || !activity_end_date) {
      wx.showToast({ title: '请完善时间信息', icon: 'none' }); return
    }
    if (!location) { wx.showToast({ title: '请输入活动地点', icon: 'none' }); return }
    if (this.data.activity.cover_images.length === 0) {
      wx.showToast({ title: '请至少上传一张封面图片', icon: 'none' }); return
    }


    wx.showLoading({ title: '检查中...' })


    try {
      const checkResult = await api.adminGetActivities()
      if (checkResult.success) {
        const existingTitles = checkResult.data.map(a => a.title)
        if (existingTitles.includes(this.data.activity.title)) {
          wx.hideLoading()
          wx.showModal({ title: '活动名重复', content: '已存在同名活动，请修改活动标题后再保存', showCancel: false })
          return
        }
      }


      wx.showLoading({ title: '创建中...' })


      const combineDateTime = (date, time) => {
        if (!date) return null
        return `${date} ${time || '00:00'}:00`
      }
      
      const activityData = {
        title: this.data.activity.title,
        description: this.data.activity.description,
        category: this.data.activity.category,
        cover_images: this.data.activity.cover_images,
        registration_start: combineDateTime(this.data.activity.registration_start_date, this.data.activity.registration_start_time),
        registration_end: combineDateTime(this.data.activity.registration_end_date, this.data.activity.registration_end_time),
        activity_start: combineDateTime(this.data.activity.activity_start_date, this.data.activity.activity_start_time),
        activity_end: combineDateTime(this.data.activity.activity_end_date, this.data.activity.activity_end_time),
        cancel_deadline: this.data.activity.cancel_deadline_date ? combineDateTime(this.data.activity.cancel_deadline_date, this.data.activity.cancel_deadline_time) : null,
        location: this.data.activity.location,
        latitude: this.data.activity.latitude,
        longitude: this.data.activity.longitude,
        registration_requirements: this.data.activity.registration_requirements,
        fee_details: this.data.activity.fee_details,
        base_fee: parseFloat(this.data.activity.base_fee) || 0,
        insurance_fee: parseFloat(this.data.activity.insurance_fee) || 0,
        transport_fee: parseFloat(this.data.activity.transport_fee) || 0,
        meal_fee: parseFloat(this.data.activity.meal_fee) || 0,
        max_participants: parseInt(this.data.activity.max_participants) || 50,
        notices: this.data.activity.notices,
        is_top: this.data.activity.is_top || false,
        is_carousel: this.data.activity.is_carousel || false,
        no_review_needed: this.data.activity.no_review_needed ? 1 : 0
      }


      console.log('===== onSaveAsNew 提交数据 =====', JSON.stringify(activityData))


      const result = await api.adminSaveActivityAsNew(this.data.activityId, activityData)


      wx.hideLoading()


      if (result.success) {
        wx.showToast({ title: '新活动创建成功', icon: 'success' })
        setTimeout(() => { wx.navigateBack() }, 1500)
      } else {
        console.error('保存为新活动失败，后端返回:', JSON.stringify(result))
        wx.showToast({ title: result.message || '创建失败', icon: 'none' })
      }
    } catch (error) {
      console.error('===== 保存为新活动异常 =====')
      console.error('错误对象:', JSON.stringify(error))
      wx.hideLoading()
      const errMsg = (error && error.message) ? error.message : (typeof error === 'string' ? error : '请求失败，请检查网络')
      wx.showToast({ title: errMsg, icon: 'none' })
    }
  }
})
