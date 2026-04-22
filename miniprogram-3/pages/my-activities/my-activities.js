const api = require('../../utils/api')
const { triggerPayment } = require('../../utils/payment')

Page({
  data: {
    userActivities: {},
    hasNoActivities: true
  },

  onLoad() {
    this.loadActivities()
  },

  onShow() {
    this.loadActivities()
  },

  async loadActivities() {
    try {
      const result = await api.getUserActivities()
      
      if (result.success) {
        const activities = result.data
        
        // 处理每个已通过的活动，判断是否可以退款
        if (activities.approved) {
          const now = new Date()
          
          activities.approved = activities.approved.map(item => {
            let canRefund = true
            
            // 如果有退款截止时间，判断是否已过期
            if (item.cancel_deadline) {
              const deadline = this.parseDate(item.cancel_deadline)
              canRefund = now <= deadline
            }
            
            // 如果已经申请退款，不能再次申请
            if (item.refund_status && item.refund_status !== 'none') {
              canRefund = false
            }
            
            // 格式化退款截止时间
            if (item.cancel_deadline) {
              item.cancel_deadline_cn = this.formatDateTime(item.cancel_deadline)
            }
            
            return {
              ...item,
              can_refund: canRefund
            }
          })
        }
        
        const activityCount = (activities.pending?.length || 0) +
                             (activities.approved?.length || 0) +
                             (activities.completed?.length || 0) +
                             (activities.cancelled?.length || 0) +
                             (activities.rejected?.length || 0)
        
        this.setData({
          userActivities: activities,
          hasNoActivities: activityCount === 0
        })
      }
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  parseDate(dateStr) {
    if (!dateStr) return new Date()
    const iosCompatible = dateStr.replace(/-/g, '/')
    try {
      const date = new Date(iosCompatible)
      if (!isNaN(date.getTime())) {
        return date
      }
      return new Date()
    } catch (e) {
      console.error('日期解析错误:', e)
      return new Date()
    }
  },

  formatDateTime(dateStr) {
    if (!dateStr) return ''
    try {
      const date = this.parseDate(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${year}年${month}月${day}日 ${hour}:${minute}`
    } catch (e) {
      return dateStr
    }
  },

  onActivityClick(e) {
    const activityId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/activity-detail/activity-detail?id=${activityId}`
    })
  },

  async onCancelActivity(e) {
    const registrationId = e.currentTarget.dataset.id
    const activityTitle = e.currentTarget.dataset.title
    
    wx.showModal({
      title: '取消报名',
      content: `确定要取消"${activityTitle}"的报名吗？取消后可重新报名。`,
      showCancel: true,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '取消中...' })
            
            const result = await api.cancelActivity(registrationId, {
              cancel_reason: '用户主动取消'
            })
            
            wx.hideLoading()
            
            if (result.success) {
              wx.showToast({
                title: '已取消报名',
                icon: 'success'
              })
              this.loadActivities()
            } else {
              wx.showToast({
                title: result.message || '取消失败',
                icon: 'none'
              })
            }
          } catch (error) {
            wx.hideLoading()
            wx.showToast({
              title: '网络错误',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  async onPayActivity(e) {
    const registrationId = e.currentTarget.dataset.id
    const totalAmount = parseFloat(e.currentTarget.dataset.amount)

    try {
      const payResult = await triggerPayment('activity', registrationId, totalAmount)
      if (payResult.success) {
        wx.showToast({ title: '支付成功', icon: 'success' })
        this.loadActivities()
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
  },
  
  onPullDownRefresh() {
    this.loadActivities()
    wx.stopPullDownRefresh()
  },

  async onRequestRefund(e) {
    const registrationId = e.currentTarget.dataset.id
    const activityTitle = e.currentTarget.dataset.title
    const canRefund = e.currentTarget.dataset.canRefund

    if (!canRefund) {
      wx.showToast({
        title: '已超过退款截止时间',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '申请退款',
      content: '请输入退款原因',
      editable: true,
      placeholderText: '请输入退款原因',
      success: async (res) => {
        if (res.confirm) {
          const refundReason = res.content || '用户申请退款'

          try {
            wx.showLoading({ title: '提交中...' })

            const result = await api.requestRefund(registrationId, {
              refund_reason: refundReason
            })

            wx.hideLoading()

            if (result.success) {
              wx.showToast({
                title: '退款申请已提交',
                icon: 'success'
              })
              this.loadActivities()
            } else {
              wx.showToast({
                title: result.message || '提交失败',
                icon: 'none'
              })
            }
          } catch (error) {
            wx.hideLoading()
            wx.showToast({
              title: '网络错误',
              icon: 'none'
            })
          }
        }
      }
    })
  }
})