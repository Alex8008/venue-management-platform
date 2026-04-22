const api = require('../../utils/api')

Page({
  data: {
    activityId: 0,
    activity: {},
    userProfile: {},
    skipInsurance: false,
    skipTransport: false,
    skipMeal: false,
    totalAmount: 0,
    agreed: false
  },

  onLoad(options) {
    const activityId = parseInt(options.activityId)
    this.setData({ activityId })
    this.loadData()
  },

  async loadData() {
    try {
      const [activityResult, profileResult] = await Promise.all([
        api.getActivityDetail(this.data.activityId),
        api.getUserProfile()
      ])

      if (activityResult.success) {
        const activity = activityResult.data
        this.setData({ 
          activity: {
            ...activity,
            insurance_fee: activity.insurance_fee || 0,
            transport_fee: activity.transport_fee || 0,
            meal_fee: activity.meal_fee || 0
          }
        })
        this.calculateTotal()
      }

      if (profileResult.success) {
        this.setData({ 
          userProfile: profileResult.data
        })
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  calculateTotal() {
    const { base_fee, insurance_fee, transport_fee, meal_fee } = this.data.activity
    const { skipInsurance, skipTransport, skipMeal } = this.data
    
    let total = parseFloat(base_fee) || 0
    
    if (!skipInsurance && insurance_fee) {
      total += parseFloat(insurance_fee)
    }
    
    if (!skipTransport && transport_fee) {
      total += parseFloat(transport_fee)
    }
    
    if (!skipMeal && meal_fee) {
      total += parseFloat(meal_fee)
    }
    
    this.setData({ totalAmount: total.toFixed(2) })
  },

  onInsuranceChange(e) {
    this.setData({
      skipInsurance: e.detail.value.length > 0
    })
    this.calculateTotal()
  },

  onTransportChange(e) {
    this.setData({
      skipTransport: e.detail.value.length > 0
    })
    this.calculateTotal()
  },

  onMealChange(e) {
    this.setData({
      skipMeal: e.detail.value.length > 0
    })
    this.calculateTotal()
  },

  onAgreedChange(e) {
    this.setData({
      agreed: e.detail.value.length > 0
    })
  },

  async onSubmit() {
    if (!this.data.agreed) {
      wx.showToast({
        title: '请先同意报名条件',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '提交中...' })

    try {
      const requestData = {
        skip_insurance: this.data.skipInsurance,
        skip_transport: this.data.skipTransport,
        skip_meal: this.data.skipMeal,
        total_amount: this.data.totalAmount
      }

      console.log('发送报名请求:', requestData)  // 添加日志
      
      const result = await api.registerActivity(this.data.activityId, requestData)
      
      console.log('报名结果:', result)  // 添加日志
      
      wx.hideLoading()
      
      // 修复：正确处理成功响应
      if (result.success) {
        wx.showToast({
          title: result.message || '报名成功',
          icon: 'success',
          duration: 2000
        })
        
        setTimeout(() => {
          wx.navigateBack()
        }, 2000)
      } else {
        // 处理业务逻辑错误
        wx.showToast({
          title: result.message || '报名失败',
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      // 处理网络错误或其他异常
      console.error('报名异常:', error)
      wx.hideLoading()
      
      wx.showToast({
        title: '网络错误，请稍后重试',
        icon: 'none',
        duration: 2000
      })
    }
  }
})