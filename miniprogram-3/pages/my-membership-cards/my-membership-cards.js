const app = getApp()
const api = require('../../utils/api')

Page({
  data: {
    membershipCards: [],
    loading: false
  },

  onLoad() {
    this.loadMembershipCards()
  },

  onShow() {
    this.loadMembershipCards()
  },

  // 加载会员卡列表
  loadMembershipCards() {
    this.setData({ loading: true })

    api.getUserMembershipCards().then(res => {
      if (res.code === 200) {
        this.setData({
          membershipCards: res.data || [],
          loading: false
        })
      } else {
        this.setData({ loading: false })
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      this.setData({ loading: false })
      console.error('加载会员卡失败:', err)
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      })
    })
  },

  // 激活会员卡
  onActivateCard(e) {
    const cardId = e.currentTarget.dataset.id

    wx.showModal({
      title: '激活会员卡',
      content: '确认激活此会员卡吗？激活后将开始计算有效期。',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '激活中...' })

          api.activateUserMembershipCard(cardId).then(res => {
            wx.hideLoading()
            if (res.code === 200) {
              wx.showToast({
                title: '激活成功',
                icon: 'success'
              })
              this.loadMembershipCards()
            } else {
              wx.showToast({
                title: res.message || '激活失败',
                icon: 'none'
              })
            }
          }).catch(err => {
            wx.hideLoading()
            console.error('激活会员卡失败:', err)
            wx.showToast({
              title: '网络错误',
              icon: 'none'
            })
          })
        }
      }
    })
  },

  // 查看详情 — 跳转到会员卡详情页
  onViewDetail(e) {
    const cardId = e.currentTarget.dataset.id
    // 找到对应卡，取 card_id（原始会员卡产品ID）
    const card = this.data.membershipCards.find(c => c.id === cardId)
    if (!card) return
    wx.navigateTo({
      url: `/pages/membership-card-detail/membership-card-detail?id=${card.card_id}`
    })
  },


  // 点击卡片
  onCardClick(e) {
    const cardId = e.currentTarget.dataset.id
    const card = this.data.membershipCards.find(c => c.id === cardId)
    if (!card) return
    wx.navigateTo({
      url: `/pages/membership-card-detail/membership-card-detail?id=${card.card_id}`
    })
  },


  // 购买会员卡
  onBuyCard() {
    wx.navigateTo({
      url: '/pages/membership-cards/membership-cards'
    })
  }
})
