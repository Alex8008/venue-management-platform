const api = require('../../utils/api')
const { triggerPayment } = require('../../utils/payment')

Page({
  data: {
    cartItems: [],
    selectedItems: [],
    totalAmount: 0,
    allSelected: false,
    defaultAddress: null
  },

  onLoad() {
    this.loadCart()
    this.loadDefaultAddress()
  },

  onShow() {
    this.loadCart()
    this.loadDefaultAddress()
  },

  async loadCart() {
    try {
      const result = await api.getCart()
      
      if (result.success) {
        const cartItems = result.data || []
        cartItems.forEach(item => { item.selected = true })
        this.setData({
          cartItems,
          selectedItems: cartItems.map(item => item.id),
          allSelected: cartItems.length > 0
        })
        this.calculateTotal()
      }
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  async loadDefaultAddress() {
    try {
      const result = await api.getAddresses()
      
      if (result.success) {
        const addresses = result.data || []
        const defaultAddr = addresses.find(a => a.is_default) || addresses[0]
        this.setData({
          defaultAddress: defaultAddr || null
        })
      }
    } catch (error) {
      console.error('加载地址失败:', error)
    }
  },

  onSelectItem(e) {
    const itemId = e.currentTarget.dataset.id
    const cartItems = this.data.cartItems.map(item => {
      if (item.id === itemId) {
        item.selected = !item.selected
      }
      return item
    })
    const selectedItems = cartItems.filter(item => item.selected).map(item => item.id)

    this.setData({
      cartItems,
      selectedItems,
      allSelected: selectedItems.length === cartItems.length && cartItems.length > 0
    })
    this.calculateTotal()
  },

  onSelectAll() {
    const allSelected = !this.data.allSelected
    const cartItems = this.data.cartItems.map(item => {
      item.selected = allSelected
      return item
    })
    const selectedItems = allSelected ? cartItems.map(item => item.id) : []

    this.setData({
      allSelected,
      cartItems,
      selectedItems
    })
    this.calculateTotal()
  },

  calculateTotal() {
    const selectedIds = this.data.selectedItems
    const total = this.data.cartItems
      .filter(item => selectedIds.includes(item.id))
      .reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    this.setData({
      totalAmount: total.toFixed(2)
    })
  },

  async onQuantityChange(e) {
    const itemId = e.currentTarget.dataset.id
    const type = e.currentTarget.dataset.type
    const item = this.data.cartItems.find(i => i.id === itemId)
    
    let newQuantity = item.quantity
    if (type === 'plus') {
      if (newQuantity >= item.stock) {
        wx.showToast({
          title: '超过库存数量',
          icon: 'none'
        })
        return
      }
      newQuantity++
    } else {
      if (newQuantity <= 1) {
        wx.showToast({
          title: '数量不能少于1',
          icon: 'none'
        })
        return
      }
      newQuantity--
    }

    try {
      const result = await api.updateCartItem(itemId, { quantity: newQuantity })
      
      if (result.success) {
        this.loadCart()
      }
    } catch (error) {
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    }
  },

  async onDeleteItem(e) {
    const itemId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个商品吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await api.deleteCartItem(itemId)
            
            if (result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
              this.loadCart()
            }
          } catch (error) {
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  onManageAddress() {
    wx.navigateTo({
      url: '/pages/address-manage/address-manage'
    })
  },

  onGoShop() {
    wx.switchTab({
      url: '/pages/shop/shop'
    })
  },

  async onCheckout() {
    if (this.data.selectedItems.length === 0) {
      wx.showToast({
        title: '请选择要购买的商品',
        icon: 'none'
      })
      return
    }

    if (!this.data.defaultAddress) {
      wx.showModal({
        title: '提示',
        content: '请先添加收货地址',
        success: (res) => {
          if (res.confirm) {
            this.onManageAddress()
          }
        }
      })
      return
    }

    try {
      wx.showLoading({ title: '创建订单中...' })

      const items = this.data.cartItems
        .filter(item => this.data.selectedItems.includes(item.id))
        .map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))

      const orderData = {
        items,
        address_id: this.data.defaultAddress.id
      }

      const result = await api.createOrder(orderData)

      wx.hideLoading()

      if (result.success) {
        try {
          const payResult = await triggerPayment('product', result.data.order_id, result.data.total_amount)
          if (payResult.success) {
            wx.showToast({ title: '支付成功', icon: 'success' })
            setTimeout(() => {
              wx.switchTab({ url: '/pages/shop/shop' })
            }, 1500)
          } else if (payResult.cancelled) {
            wx.showModal({
              title: '支付取消',
              content: '订单已创建，可在"我的订单"中继续支付',
              showCancel: false
            })
          }
        } catch (payError) {
          console.error('支付失败:', payError)
          wx.showModal({
            title: '支付异常',
            content: String(payError.message || payError || '未知错误') + '\n\n订单已创建，可在订单中重新支付',
            showCancel: false
          })
        }
      } else {
        wx.showToast({
          title: result.message || '创建订单失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('下单失败:', error)
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      })
    }
  },

  onCartClick() {
    // 已经在购物车页面，不需要跳转
  },

  onCreateOrder() {
    this.onCheckout()
  },
  onPullDownRefresh() {
    this.loadCart()
    this.loadDefaultAddress()
    wx.stopPullDownRefresh()
  },

})
