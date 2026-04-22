const api = require('../../utils/api')

Page({
  data: {
    notifications: [],
    loading: false,
    page: 1,
    hasMore: true,
    typeMap: {
      'registration_approved': '报名通过',
      'registration_rejected': '报名拒绝',
      'refund_approved': '退款通过',
      'refund_rejected': '退款拒绝',
      'insurance_approved': '保险通过',
      'insurance_rejected': '保险拒绝',
      'activity_reminder': '活动提醒',
      'payment_success': '支付成功',
      'new_registration': '新报名',
      'new_refund': '新退款',
      'new_insurance': '新保险',
      'new_delivery': '新配送单',
      'delivery_confirmed': '配送已确认',
      'new_course_booking': '新课程预约',
    }
  },

  onLoad() {
    this.loadNotifications()
  },

  onShow() {
    // 每次显示页面时重新加载
    this.setData({
      notifications: [],
      page: 1,
      hasMore: true
    })
    this.loadNotifications()
  },

  onPullDownRefresh() {
    this.setData({
      notifications: [],
      page: 1,
      hasMore: true
    })
    this.loadNotifications()
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadNotifications()
    }
  },

  async loadNotifications() {
    if (this.data.loading) return
    
    this.setData({ loading: true })

    try {
      const result = await api.getUserNotifications({
        page: this.data.page,
        limit: 20
      })
      
      if (result.success) {
        const newNotifications = result.data || []
        this.setData({
          notifications: this.data.page === 1 ? newNotifications : [...this.data.notifications, ...newNotifications],
          page: this.data.page + 1,
          hasMore: newNotifications.length === 20
        })
      }
    } catch (error) {
      console.error('加载通知失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }

    this.setData({ loading: false })
  },

  async onNotificationClick(e) {
    const notificationId = e.currentTarget.dataset.id
    const notification = this.data.notifications.find(n => n.id === notificationId)
    
    if (!notification) return
    
    // 如果未读，标记为已读
    if (!notification.is_read) {
      try {
        await api.markNotificationAsRead(notificationId)
        
        // 更新本地数据
        const notifications = this.data.notifications.map(n => {
          if (n.id === notificationId) {
            return { ...n, is_read: 1 }
          }
          return n
        })
        
        this.setData({
          notifications
        })
      } catch (error) {
        console.error('标记已读失败:', error)
      }
    }
  }
})
