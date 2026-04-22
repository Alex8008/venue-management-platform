const api = require('../../utils/api')
const { triggerPayment } = require('../../utils/payment')

Page({
  data: {
    order: null,
    statusMap: {
      'pending': '待支付',
      'paid': '已支付',
      'shipped': '已发货',
      'completed': '已完成',
      'cancelled': '已取消',
      'refunded': '已退款'
    },
    refundStatusMap: {
      'none': '',
      'pending': '退款审核中',
      'approved': '退款已通过',
      'rejected': '退款被拒绝'
    }
  },

  onLoad(options) {
    const orderId = parseInt(options.id)
    this.setData({ orderId })
    this.loadOrderDetail(orderId)
  },

  async loadOrderDetail(orderId) {
    try {
      wx.showLoading({ title: '加载中...' })
      const result = await api.getUserOrders()
      wx.hideLoading()
      if (result.success) {
        const order = (result.data || []).find(o => o.id === orderId)
        if (order) {
          this.setData({ order })
        } else {
          wx.showToast({ title: '订单不存在', icon: 'none' })
        }
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  onProductClick(e) {
    const productId = e.currentTarget.dataset.id
    if (productId) {
      wx.navigateTo({
        url: `/pages/product-detail/product-detail?id=${productId}`
      })
    }
  },


  async onPayOrder() {
    const order = this.data.order
    try {
      const result = await triggerPayment('product', order.id, order.total_amount)
      if (result.success) {
        wx.showToast({ title: '支付成功', icon: 'success' })
        this.loadOrderDetail(order.id)
      } else if (result.cancelled) {
        wx.showToast({ title: '支付已取消', icon: 'none' })
      }
    } catch (error) {
      console.error('支付失败:', error)
      wx.showToast({ title: error.message || '支付失败', icon: 'none' })
    }
  },

  onRequestRefund() {
    const order = this.data.order
    wx.showModal({
      title: '申请退款',
      content: '请输入退款原因',
      editable: true,
      placeholderText: '请输入退款原因',
      success: async (res) => {
        if (res.confirm && res.content) {
          try {
            wx.showLoading({ title: '提交中...' })
            const result = await api.requestOrderRefund(order.id, {
              refund_reason: res.content
            })
            wx.hideLoading()
            if (result.success) {
              wx.showToast({ title: '退款申请已提交', icon: 'success' })
              this.loadOrderDetail(order.id)
            } else {
              wx.showToast({ title: result.message || '申请失败', icon: 'none' })
            }
          } catch (error) {
            wx.hideLoading()
            wx.showToast({ title: '申请失败', icon: 'none' })
          }
        }
      }
    })
  },
  onPullDownRefresh() {
    if (this.data.orderId) {
      this.loadOrderDetail(this.data.orderId)
    }
    wx.stopPullDownRefresh()
  }

})
