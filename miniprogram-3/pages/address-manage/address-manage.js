const api = require('../../utils/api')

Page({
  data: {
    addresses: [],
    loading: false
  },

  onLoad() {
    this.loadAddresses()
  },

  onShow() {
    this.loadAddresses()
  },

  async loadAddresses() {
    this.setData({ loading: true })
    
    try {
      const result = await api.getAddresses()
      
      if (result.success) {
        this.setData({
          addresses: result.data || []
        })
      }
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
    
    this.setData({ loading: false })
  },

  onAddAddress() {
    wx.navigateTo({
      url: '/pages/address-edit/address-edit'
    })
  },

  onEditAddress(e) {
    const addressId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/address-edit/address-edit?id=${addressId}`
    })
  },

  async onDeleteAddress(e) {
    const addressId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await api.deleteAddress(addressId)
            
            if (result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
              this.loadAddresses()
            } else {
              wx.showToast({
                title: result.message || '删除失败',
                icon: 'none'
              })
            }
          } catch (error) {
            wx.showToast({
              title: '网络错误',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  onPullDownRefresh() {
    this.loadAddresses()
    wx.stopPullDownRefresh()
  },

  async onSetDefault(e) {
    const addressId = e.currentTarget.dataset.id
    
    try {
      const result = await api.updateAddress(addressId, { is_default: true })
      
      if (result.success) {
        wx.showToast({
          title: '设置成功',
          icon: 'success'
        })
        this.loadAddresses()
      }
    } catch (error) {
      wx.showToast({
        title: '设置失败',
        icon: 'none'
      })
    }
  }
})