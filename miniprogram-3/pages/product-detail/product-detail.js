const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    productId: null,
    product: null,
    loading: true,
    cartCount: 0
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ productId: parseInt(options.id) })
      this.loadProduct()
      this.loadCartCount()
    } else {
      this.setData({ loading: false })
    }
  },

  loadProduct() {
    wx.request({
      url: `${app.globalData.apiUrl}/api/products/${this.data.productId}`,
      method: 'GET',
      success: (res) => {
        this.setData({ loading: false })
        if (res.data.code === 200) {
          this.setData({ product: res.data.data })
          wx.setNavigationBarTitle({ title: res.data.data.name || '商品详情' })
        }
      },
      fail: () => {
        this.setData({ loading: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  loadCartCount() {
    const userId = wx.getStorageSync('userId')
    const openid = wx.getStorageSync('openid')

    const header = {}
    if (openid) {
      header['OpenId'] = openid
    } else if (userId) {
      header['User-Id'] = userId
    }

    wx.request({
      url: `${app.globalData.apiUrl}/api/cart`,
      method: 'GET',
      header: header,
      success: (res) => {
        if (res.data.code === 200) {
          const items = res.data.data || []
          let count = 0
          items.forEach(item => {
            count += item.quantity || 1
          })
          this.setData({ cartCount: count })
        }
      }
    })
  },

  onAddToCart() {
    const userId = wx.getStorageSync('userId')
    const openid = wx.getStorageSync('openid')

    const header = {
      'Content-Type': 'application/json'
    }
    if (openid) {
      header['OpenId'] = openid
    } else if (userId) {
      header['User-Id'] = userId
    }

    wx.request({
      url: `${app.globalData.apiUrl}/api/cart`,
      method: 'POST',
      data: {
        product_id: this.data.productId,
        quantity: 1
      },
      header: header,
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({ title: '已加入购物车', icon: 'success' })
          this.loadCartCount()
        } else {
          wx.showToast({ title: res.data.message || '添加失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  onBuyNow() {
    const userId = wx.getStorageSync('userId')
    const openid = wx.getStorageSync('openid')

    const header = {
      'Content-Type': 'application/json'
    }
    if (openid) {
      header['OpenId'] = openid
    } else if (userId) {
      header['User-Id'] = userId
    }

    wx.request({
      url: `${app.globalData.apiUrl}/api/cart`,
      method: 'POST',
      data: {
        product_id: this.data.productId,
        quantity: 1
      },
      header: header,
      success: (res) => {
        if (res.data.code === 200) {
          wx.switchTab({ url: '/pages/shop/shop' })
        } else {
          wx.showToast({ title: res.data.message || '操作失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  goToCart() {
    wx.navigateTo({ url: '/pages/cart/cart' })
  },

  onGoHome() {
    wx.switchTab({
      url: '/pages/home/home'
    })
  },

  onShareAppMessage() {
    return {
      title: this.data.product ? this.data.product.name : '商品分享',
      path: `/pages/product-detail/product-detail?id=${this.data.productId}`,
      imageUrl: this.data.product ? this.data.product.image_url : ''
    }
  },

  onPullDownRefresh() {
    if (this.data.productId) {
      this.loadProduct()
      this.loadCartCount()
    }
    wx.stopPullDownRefresh()
  },

  async onConsult() {
    try {
      const result = await api.getConsultInfo()
      if (result.success) {
        wx.showModal({
          title: '联系咨询',
          content: result.data.consult_info || '暂无咨询信息',
          showCancel: true,
          confirmText: '知道了',
          cancelText: '取消'
        })
      }
    } catch (error) {
      console.error('获取咨询信息失败:', error)
      wx.showModal({
        title: '联系咨询',
        content: '获取咨询信息失败，请稍后再试',
        showCancel: false
      })
    }
  }
})
