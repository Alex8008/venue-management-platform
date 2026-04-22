const api = require('../../utils/api')
const { triggerPayment } = require('../../utils/payment')

Page({
  data: {
    activityId: 0,
    activity: {},
    photos: [],
    canRegister: false,
    registrationStatus: '',
    registrationButtonText: '立即报名',
    buttonDisabled: false,
    totalFee: 0,
    uploading: false,
    uploadProgress: 0,
    uploadProgressClass: '0',
    uploadedCount: 0,
    totalUploadCount: 0,
    userRegistration: null,
    isAdmin: false,
    canUploadPhoto: false,
    refreshing: false,
    needPayment: false
  },

  onLoad(options) {
    const activityId = parseInt(options.id)
    this.setData({ activityId })
    this.checkUserRole()
    this.loadActivityDetail()
    this.loadActivityPhotos()
    this.checkUserRegistration()
  },

  onShow() {
    this.checkUserRole()
    this.checkUserRegistration()
  },

  async onRefresh() {
    this.setData({ refreshing: true })
    await Promise.all([
      this.loadActivityDetail(),
      this.loadActivityPhotos(),
      this.checkUserRegistration()
    ])
    setTimeout(() => { this.setData({ refreshing: false }) }, 500)
  },

  onRestore() {
    this.setData({ refreshing: false })
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadActivityDetail(),
      this.loadActivityPhotos(),
      this.checkUserRegistration()
    ]).finally(() => { wx.stopPullDownRefresh() })
  },

  async checkUserRole() {
    try {
      const result = await api.checkAdmin()
      this.setData({ isAdmin: result.success })
      this.updateUploadPermission()
    } catch (error) {
      this.setData({ isAdmin: false })
      this.updateUploadPermission()
    }
  },

  async checkUserRegistration() {
    try {
      const result = await api.getUserActivities()
      if (result.success) {
        const allActivities = [
          ...(result.data.pending || []),
          ...(result.data.approved || []),
          ...(result.data.completed || []),
          ...(result.data.rejected || [])
        ]
        const registration = allActivities.find(a => a.activity_id === this.data.activityId)
        this.setData({ userRegistration: registration })
        this.updateUploadPermission()
        this.updateRegisterButton()
      }
    } catch (error) {
      console.error('检查报名状态失败:', error)
    }
  },

  updateUploadPermission() {
    const { isAdmin, userRegistration } = this.data
    // 管理员始终可上传；普通用户必须审核通过且已支付
    const canUpload = isAdmin || (
      userRegistration && 
      (userRegistration.status === 'approved' || userRegistration.status === 'completed') &&
      userRegistration.payment_status === 'paid'
    )
    this.setData({ canUploadPhoto: canUpload })
  },


  updateRegisterButton() {
    const { userRegistration } = this.data


    if (!userRegistration) {
      this.setData({ needPayment: false })
      this.checkCanRegister()
      return
    }


    if (userRegistration.status === 'pending') {
      this.setData({
        registrationButtonText: '待审核',
        buttonDisabled: true,
        canRegister: false,
        needPayment: false
      })
    } else if (userRegistration.status === 'approved') {
      // ★ 新增：检查退款状态
      if (userRegistration.refund_status === 'pending') {
        this.setData({
          registrationButtonText: '退款中',
          buttonDisabled: true,
          canRegister: false,
          needPayment: false
        })
      } else if (userRegistration.payment_status === 'unpaid') {
        this.setData({
          registrationButtonText: '去支付',
          buttonDisabled: false,
          canRegister: false,
          needPayment: true
        })
      } else {
        this.setData({
          registrationButtonText: '已报名',
          buttonDisabled: true,
          canRegister: false,
          needPayment: false
        })
      }
    } else if (userRegistration.status === 'completed') {
      this.setData({
        registrationButtonText: '已报名',
        buttonDisabled: true,
        canRegister: false,
        needPayment: false
      })
    } else if (userRegistration.status === 'rejected' || userRegistration.status === 'cancelled') {
      // ★ 被拒绝或已取消（包括退款通过后的取消），恢复默认报名状态
      this.setData({ needPayment: false })
      this.checkCanRegister()
    }
  },


  checkCanRegister() {
    const activity = this.data.activity
    if (!activity || !activity.registration_start) return

    const now = new Date()
    const startTime = this.parseDate(activity.registration_start)
    const endTime = this.parseDate(activity.registration_end)

    let canRegister = false
    let registrationStatus = ''

    if (now < startTime) {
      registrationStatus = '报名未开始'
    } else if (now > endTime) {
      registrationStatus = '报名已截止'
    } else if (activity.current_participants >= activity.max_participants) {
      registrationStatus = '报名已满'
    } else {
      canRegister = true
      registrationStatus = '立即报名'
    }

    this.setData({
      canRegister,
      registrationButtonText: registrationStatus,
      buttonDisabled: !canRegister
    })
  },

  async loadActivityDetail() {
    try {
      const result = await api.getActivityDetail(this.data.activityId)
      if (result.success) {
        const activity = result.data
        if (!activity.cover_images || activity.cover_images.length === 0) {
          activity.cover_images = ['https://picsum.photos/750/400?random=1']
        }
        const totalFee = (parseFloat(activity.base_fee) || 0) +
                        (parseFloat(activity.insurance_fee) || 0) +
                        (parseFloat(activity.transport_fee) || 0) +
                        (parseFloat(activity.meal_fee) || 0)
        this.setData({ activity, totalFee })
        this.checkCanRegister()
        this.updateRegisterButton()
      }
    } catch (error) {
      console.error('加载活动详情失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  parseDate(dateStr) {
    if (!dateStr) return new Date()
    const iosCompatible = dateStr.replace(/-/g, '/')
    try {
      const date = new Date(iosCompatible)
      if (!isNaN(date.getTime())) return date
      return new Date()
    } catch (e) { return new Date() }
  },

  async loadActivityPhotos() {
    try {
      const result = await api.getActivityPhotos(this.data.activityId)
      if (result.success) {
        this.setData({ photos: result.data || [] })
      }
    } catch (error) {
      console.error('加载活动照片失败:', error)
    }
  },

  async onRegisterClick() {
    if (this.data.buttonDisabled) {
      wx.showToast({ title: this.data.registrationButtonText, icon: 'none' })
      return
    }

    // 待支付状态：触发支付
    if (this.data.needPayment && this.data.userRegistration) {
      const reg = this.data.userRegistration
      try {
        const payResult = await triggerPayment('activity', reg.id, reg.total_amount)
        if (payResult.success) {
          wx.showToast({ title: '支付成功', icon: 'success' })
          this.checkUserRegistration()
        } else if (payResult.cancelled) {
          wx.showToast({ title: '已取消支付', icon: 'none' })
        }
      } catch (error) {
        wx.showModal({
          title: '支付异常',
          content: String(error.message || '未知错误'),
          showCancel: false
        })
      }
      return
    }

    if (!this.data.canRegister) {
      wx.showToast({ title: this.data.registrationButtonText, icon: 'none' })
      return
    }

    wx.navigateTo({
      url: `/pages/register/register?activityId=${this.data.activityId}`
    })
  },

  onUploadPhoto() {
    if (!this.data.canUploadPhoto) {
      wx.showToast({ title: '仅管理员和参与者可上传照片', icon: 'none', duration: 2000 })
      return
    }
    wx.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePaths = res.tempFilePaths
        const totalCount = tempFilePaths.length
        this.setData({ uploading: true, totalUploadCount: totalCount, uploadedCount: 0, uploadProgress: 0, uploadProgressClass: '0' })
        for (let i = 0; i < tempFilePaths.length; i++) {
          try {
            const uploadResult = await api.uploadActivityPhoto(this.data.activityId, tempFilePaths[i])
            if (uploadResult.success) {
              const uploadedCount = i + 1
              const progress = Math.floor((uploadedCount / totalCount) * 100)
              let progressClass = '0'
              if (progress >= 100) progressClass = '100'
              else if (progress >= 90) progressClass = '90'
              else if (progress >= 80) progressClass = '80'
              else if (progress >= 70) progressClass = '70'
              else if (progress >= 60) progressClass = '60'
              else if (progress >= 50) progressClass = '50'
              else if (progress >= 40) progressClass = '40'
              else if (progress >= 30) progressClass = '30'
              else if (progress >= 20) progressClass = '20'
              else if (progress >= 10) progressClass = '10'
              this.setData({ uploadedCount, uploadProgress: progress, uploadProgressClass: progressClass })
            }
          } catch (error) { console.error(`上传第${i + 1}张异常:`, error) }
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        this.setData({ uploading: false })
        wx.showToast({ title: `成功上传${this.data.uploadedCount}张照片`, icon: 'success' })
        this.loadActivityPhotos()
      }
    })
  },

  onViewAllPhotos() {
    if (this.data.photos.length === 0) return
    wx.navigateTo({ url: `/pages/activity-photos/activity-photos?id=${this.data.activityId}&title=${this.data.activity.title}` })
  },

  onLocationClick() {
    if (this.data.activity.latitude && this.data.activity.longitude) {
      wx.openLocation({
        latitude: parseFloat(this.data.activity.latitude),
        longitude: parseFloat(this.data.activity.longitude),
        name: this.data.activity.location,
        address: this.data.activity.location
      })
    } else {
      wx.showToast({ title: '该活动未设置地理位置', icon: 'none' })
    }
  },

  onGoHome() { wx.switchTab({ url: '/pages/home/home' }) },

  onShareAppMessage() {
    return {
      title: this.data.activity.title || '精彩活动分享',
      path: `/pages/activity-detail/activity-detail?id=${this.data.activityId}`,
      imageUrl: this.data.activity.cover_images && this.data.activity.cover_images.length > 0 ? this.data.activity.cover_images[0] : ''
    }
  },

  async onConsult() {
    try {
      const result = await api.getConsultInfo()
      if (result.success) {
        wx.showModal({ title: '联系咨询', content: result.data.consult_info || '暂无咨询信息', showCancel: true, confirmText: '知道了', cancelText: '取消' })
      }
    } catch (error) {
      wx.showModal({ title: '联系咨询', content: '获取咨询信息失败，请稍后再试', showCancel: false })
    }
  }
})
