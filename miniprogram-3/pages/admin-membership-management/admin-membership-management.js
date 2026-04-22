const app = getApp()

Page({
  data: {
    cards: [],
    loading: false
  },

  onLoad() {
    this.loadCards()
  },

  onShow() {
    this.loadCards()
  },

  loadCards() {
    this.setData({ loading: true })

    wx.request({
      url: `${app.globalData.apiUrl}/api/membership-cards`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({
            cards: res.data.data || [],
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
        console.error('加载会员卡失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  onAdd() {
    wx.navigateTo({
      url: '/pages/admin-membership-edit/admin-membership-edit'
    })
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/admin-membership-edit/admin-membership-edit?id=${id}`
    })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id

    wx.showModal({
      title: '删除会员卡',
      content: '确认删除此会员卡吗？',
      confirmColor: '#ff5722',
      success: (res) => {
        if (res.confirm) {
          this.deleteCard(id)
        }
      }
    })
  },

  deleteCard(id) {
    wx.showLoading({ title: '删除中...' })

    const userId = wx.getStorageSync('userId')
    const openid = wx.getStorageSync('openid')

    const header = {}
    if (openid) {
      header['OpenId'] = openid
    } else if (userId) {
      header['User-Id'] = userId
    }

    wx.request({
      url: `${app.globalData.apiUrl}/api/membership-cards/${id}`,
      method: 'DELETE',
      header: header,
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
          this.loadCards()
        } else {
          wx.showToast({
            title: res.data.message || '删除失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('删除失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  }
})
