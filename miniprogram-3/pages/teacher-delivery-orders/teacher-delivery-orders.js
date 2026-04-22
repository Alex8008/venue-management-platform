const app = getApp()

Page({
  data: {
    orders: [],
    currentStatus: 'pending',
    loading: false
  },

  onLoad() {
    this.loadOrders()
  },

  onShow() {
    this.loadOrders()
  },

  // 切换状态
  onTabClick(e) {
    const status = e.currentTarget.dataset.status
    this.setData({
      currentStatus: status
    })
    this.loadOrders()
  },

  // 加载配送单列表
  loadOrders() {
    this.setData({ loading: true })

    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }
    wx.request({
      url: `${app.globalData.apiUrl}/api/delivery-orders`,
      method: 'GET',
      header: header,
      data: {
        status: this.data.currentStatus
      },
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({
            orders: res.data.data || [],
            loading: false
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
        console.error('加载配送单失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  // 标记已配送
  onMarkDelivered(e) {
    const orderId = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认配送',
      content: '确认已将商品配送给用户吗？',
      success: (res) => {
        if (res.confirm) {
          const openid = wx.getStorageSync('openid')
          const userId = wx.getStorageSync('userId')
          wx.showLoading({ title: '处理中...' })

          const header = { 'Content-Type': 'application/json' }
          if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }
          wx.request({
            url: `${app.globalData.apiUrl}/api/delivery-orders/${orderId}/deliver`,
            method: 'PUT',
            header: header,
            success: (res) => {
              wx.hideLoading()
              if (res.data.code === 200) {
                wx.showToast({
                  title: '已标记为配送',
                  icon: 'success'
                })
                this.loadOrders()
              } else {
                wx.showToast({
                  title: res.data.message || '操作失败',
                  icon: 'none'
                })
              }
            },
            fail: (err) => {
              wx.hideLoading()
              console.error('标记配送失败:', err)
              wx.showToast({
                title: '网络错误',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  }
})
