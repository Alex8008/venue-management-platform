const app = getApp()
const api = require('../../utils/api')
const { triggerPayment } = require('../../utils/payment')

Page({
  data: {
    cardId: null,
    card: {},
    teachers: [],
    selectedTeacherId: null,
    hasTeachers: false,
    purchasing: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ cardId: options.id })
      this.loadCardDetail()
    }
  },

  loadCardDetail() {
    wx.showLoading({ title: '加载中...' })
    wx.request({
      url: `${app.globalData.apiUrl}/api/membership-cards/${this.data.cardId}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          const card = res.data.data
          // 确保 price 是字符串，避免 WXML 显示异常
          card.price = card.price != null ? String(card.price) : '0'
          const teachers = (card.teachers || []).map(t => ({
            ...t,
            selected: false
          }))
          this.setData({
            card,
            teachers,
            hasTeachers: teachers.length > 0
          })
        } else {
          wx.showToast({ title: res.data.message || '加载失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  onSelectTeacher(e) {
    const teacherId = e.currentTarget.dataset.id
    const teachers = this.data.teachers.map(t => ({
      ...t,
      selected: t.id === teacherId
    }))
    this.setData({ teachers, selectedTeacherId: teacherId })
  },

  // ★ 方法名必须和 wxml 中 bindtap 完全一致
  onPurchase() {
    if (this.data.purchasing) return

    if (this.data.hasTeachers && !this.data.selectedTeacherId) {
      wx.showToast({ title: '请选择教练', icon: 'none' })
      return
    }

    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    if (!openid && !userId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.setData({ purchasing: true })

    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }

    wx.showLoading({ title: '创建订单...' })

    wx.request({
      url: `${app.globalData.apiUrl}/api/membership-cards/${this.data.cardId}/purchase`,
      method: 'POST',
      header,
      data: { teacher_id: this.data.selectedTeacherId || null },
      success: async (res) => {
        wx.hideLoading()
        if (!res.data.success) {
          this.setData({ purchasing: false })
          wx.showToast({ title: res.data.message || '创建失败', icon: 'none' })
          return
        }

        const { id: userCardId, payment_amount } = res.data.data

        try {
          const payResult = await triggerPayment('membership', userCardId, payment_amount)
          this.setData({ purchasing: false })

          if (payResult.success) {
            wx.showToast({ title: '购买成功', icon: 'success' })
            setTimeout(() => {
              wx.navigateTo({ url: '/pages/my-membership-cards/my-membership-cards' })
            }, 1500)
          } else if (payResult.cancelled) {
            wx.showToast({ title: '已取消支付', icon: 'none' })
          }
        } catch (error) {
          this.setData({ purchasing: false })
          wx.showToast({ title: error.message || '支付失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        this.setData({ purchasing: false })
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/home/home' })
  },

  onShareAppMessage() {
    return {
      title: this.data.card.card_name || '会员卡',
      path: `/pages/membership-card-detail/membership-card-detail?id=${this.data.cardId}`,
      imageUrl: this.data.card.card_image || ''
    }
  },

  async onConsult() {
    try {
      const result = await api.getConsultInfo()
      if (result.success) {
        wx.showModal({
          title: '联系咨询',
          content: result.data.consult_info || '暂无咨询信息',
          showCancel: false,
          confirmText: '知道了'
        })
      }
    } catch (error) {
      wx.showModal({
        title: '联系咨询',
        content: '获取咨询信息失败，请稍后再试',
        showCancel: false
      })
    }
  }
})
