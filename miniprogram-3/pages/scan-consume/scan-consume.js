const api = require('../../utils/api')


Page({
  data: {
    loading: true,
    errorMsg: '',
    qrContent: '',
    userInfo: null,
    timesCards: [],
    activeCards: [],
    allLogs: []
  },


  onLoad(options) {
    const qr = decodeURIComponent(options.qr || '')
    if (!qr) {
      this.setData({ loading: false, errorMsg: '未获取到二维码内容' })
      return
    }
    this.setData({ qrContent: qr })
    this.verifyAndLoad(qr)
  },


  onPullDownRefresh() {
    if (this.data.qrContent) {
      this.verifyAndLoad(this.data.qrContent)
    }
    wx.stopPullDownRefresh()
  },


  async verifyAndLoad(qrContent) {
    this.setData({ loading: true, errorMsg: '' })
    try {
      const result = await api.verifyQrcode({ qr_content: qrContent })
      this.setData({ loading: false })


      if (result.success) {
        const data = result.data
        const timesCards = data.times_cards || []
        const activeCards = data.active_cards || []


        const allLogs = []
        timesCards.forEach(card => {
          (card.recent_logs || []).forEach(log => {
            allLogs.push({ ...log, card_name: card.card_name })
          })
        })
        allLogs.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))


        this.setData({
          userInfo: data.user_info,
          timesCards: timesCards,
          activeCards: activeCards,
          allLogs: allLogs.slice(0, 20)
        })
      } else {
        this.setData({ errorMsg: result.message || '验证失败' })
      }
    } catch (error) {
      this.setData({ loading: false, errorMsg: '网络错误，请重试' })
    }
  },


  onConsume(e) {
    const cardId = e.currentTarget.dataset.id
    const cardName = e.currentTarget.dataset.name
    const remaining = e.currentTarget.dataset.remaining


    wx.showModal({
      title: '确认核销',
      content: `确认为「${cardName}」核销一次吗？\n当前剩余 ${remaining} 次`,
      confirmColor: '#4caf50',
      success: async (res) => {
        if (!res.confirm) return
        try {
          wx.showLoading({ title: '核销中...' })
          const result = await api.consumeMembershipCard(cardId)
          wx.hideLoading()
          if (result.success) {
            wx.showToast({
              title: `核销成功，剩余${result.data.remaining_times}次`,
              icon: 'success',
              duration: 2000
            })
            this.verifyAndLoad(this.data.qrContent)
          } else {
            wx.showToast({ title: result.message || '核销失败', icon: 'none' })
          }
        } catch (error) {
          wx.hideLoading()
          wx.showToast({ title: '网络错误', icon: 'none' })
        }
      }
    })
  },


  onViewUserDetail() {
    if (this.data.userInfo && this.data.userInfo.id) {
      wx.navigateTo({
        url: `/pages/user-detail/user-detail?id=${this.data.userInfo.id}&name=${encodeURIComponent(this.data.userInfo.real_name || '')}`
      })
    }
  },


  onViewCardDetail(e) {
    const cardId = e.currentTarget.dataset.cardId
    if (cardId) {
      wx.navigateTo({
        url: `/pages/membership-card-detail/membership-card-detail?id=${cardId}`
      })
    }
  },


  onRescan() {
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode'],
      success: (res) => {
        const qrContent = res.result
        this.setData({ qrContent: qrContent })
        this.verifyAndLoad(qrContent)
      },
      fail: () => {
        wx.showToast({ title: '扫码取消', icon: 'none' })
      }
    })
  }
})
