const api = require('../../utils/api')

Page({
  data: {
    addressId: 0,
    isEdit: false,
    address: {
      receiver_name: '',
      receiver_phone: '',
      province: '',
      city: '',
      district: '',
      detail_address: '',
      is_default: false
    },
    regionValue: []
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        addressId: parseInt(options.id),
        isEdit: true
      })
      this.loadAddress()
    }
  },

  async loadAddress() {
    try {
      const result = await api.getAddresses()
      
      if (result.success) {
        const address = result.data.find(a => a.id === this.data.addressId)
        if (address) {
          this.setData({ 
            address,
            regionValue: [address.province, address.city, address.district]
          })
        }
      }
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`address.${field}`]: value
    })
  },

  onRegionChange(e) {
    const value = e.detail.value
    this.setData({
      'address.province': value[0],
      'address.city': value[1],
      'address.district': value[2],
      regionValue: value
    })
  },

  onDefaultChange(e) {
    this.setData({
      'address.is_default': e.detail.value.length > 0
    })
  },

  async onSave() {
    const { receiver_name, receiver_phone, province, city, district, detail_address } = this.data.address
    
    if (!receiver_name || !receiver_phone || !province || !city || !detail_address) {
      wx.showToast({
        title: '请完善地址信息',
        icon: 'none'
      })
      return
    }
    
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(receiver_phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      let result
      if (this.data.isEdit) {
        result = await api.updateAddress(this.data.addressId, this.data.address)
      } else {
        result = await api.createAddress(this.data.address)
      }

      wx.hideLoading()

      if (result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: result.message || '保存失败',
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
})