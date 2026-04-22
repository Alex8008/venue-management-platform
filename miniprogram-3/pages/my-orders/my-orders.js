const api = require('../../utils/api')
const { triggerPayment } = require('../../utils/payment')


Page({
  data: {
    orders: [],
    statusMap: {
      'pending':   '待支付',
      'paid':      '已支付',
      'shipped':   '已发货',
      'completed': '已完成',
      'cancelled': '已取消',
      'refunded':  '已退款'
    }
  },


  onLoad() {
    this.loadOrders()
  },


  onShow() {
    this.loadOrders()
  },


  onPullDownRefresh() {
    this.loadOrders()
    wx.stopPullDownRefresh()
  },


  async loadOrders() {
    try {
      const result = await api.getUserOrders()
      if (result.success) {
        this.setData({ orders: result.data || [] })
      }
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },


  // 点击订单跳转详情
  onOrderClick(e) {
    const orderId = e.currentTarget.dataset.id
    if (orderId) {
      wx.navigateTo({
        url: `/pages/order-detail/order-detail?id=${orderId}`
      })
    }
  },


  // 取消订单
  onCancelOrder(e) {
    const orderId = e.currentTarget.dataset.id
    const orderNo = e.currentTarget.dataset.orderNo


    wx.showModal({
      title: '取消订单',
      content: `确定取消订单 ${orderNo} 吗？`,
      confirmColor: '#f44336',
      success: async (res) => {
        if (!res.confirm) return
        try {
          wx.showLoading({ title: '处理中...' })
          const result = await api.deleteOrder(orderId)
          wx.hideLoading()
          if (result.success) {
            wx.showToast({ title: '订单已取消', icon: 'success' })
            this.loadOrders()
          } else {
            wx.showToast({ title: result.message || '取消失败', icon: 'none' })
          }
        } catch (error) {
          wx.hideLoading()
          wx.showToast({ title: '网络错误', icon: 'none' })
        }
      }
    })
  },

  onPullDownRefresh() {
    this.loadOrders()
    wx.stopPullDownRefresh()
  },

  // 待支付订单重新支付
  async onPayOrder(e) {
    const orderId = e.currentTarget.dataset.id
    const totalAmount = parseFloat(e.currentTarget.dataset.amount)


    try {
      const payResult = await triggerPayment('product', orderId, totalAmount)
      if (payResult.success) {
        wx.showToast({ title: '支付成功', icon: 'success' })
        this.loadOrders()
      } else if (payResult.cancelled) {
        wx.showToast({ title: '已取消支付', icon: 'none' })
      }
    } catch (error) {
      wx.showToast({ title: error.message || '支付失败', icon: 'none' })
    }
  }
})
