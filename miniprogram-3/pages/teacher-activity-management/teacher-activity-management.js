const api = require('../../utils/api')

Page({
  data: {
    activities: [],
    allActivities: [],
    searchValue: ''
  },

  onLoad() {
    this.loadActivities()
  },

  onShow() {
    this.loadActivities()
  },

  async loadActivities() {
    try {
      const result = await api.adminGetActivities()
      if (result.success) {
        this.setData({
          activities: result.data || [],
          allActivities: result.data || []
        })
      }
    } catch (error) {
      console.error('加载活动列表失败:', error)
    }
  },

  onSearchInput(e) {
    this.setData({ searchValue: e.detail.value })
  },

  onSearch() {
    const searchValue = this.data.searchValue.toLowerCase()
    if (!searchValue) {
      this.setData({ activities: this.data.allActivities })
      return
    }
    const filtered = this.data.allActivities.filter(a =>
      a.title.toLowerCase().includes(searchValue)
    )
    this.setData({ activities: filtered })
  },

  onCreateActivity() {
    wx.navigateTo({
      url: '/pages/activity-edit/activity-edit'
    })
  },

  onEditActivity(e) {
    const activityId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/activity-edit/activity-edit?id=${activityId}`
    })
  },

  onViewParticipants(e) {
    const activityId = e.currentTarget.dataset.id
    const activityTitle = e.currentTarget.dataset.title
    wx.navigateTo({
      url: `/pages/activity-participants/activity-participants?id=${activityId}&title=${activityTitle}`
    })
  },

  onDeleteActivity(e) {
    const activityId = e.currentTarget.dataset.id
    const activity = this.data.activities.find(a => a.id === activityId)
    const title = activity ? activity.title : ''

    wx.showModal({
      title: '⚠️ 危险操作',
      content: `确认删除「${title}」？\n\n此操作将同时删除：\n• 所有报名记录\n• 所有活动照片\n\n删除后无法恢复！`,
      confirmText: '确认删除',
      cancelText: '取消',
      confirmColor: '#f44336',
      success: async (res) => {
        if (!res.confirm) return

        wx.showModal({
          title: '最终确认',
          content: '您确定要永久删除此活动吗？',
          confirmText: '永久删除',
          cancelText: '取消',
          confirmColor: '#f44336',
          success: async (res2) => {
            if (!res2.confirm) return

            try {
              wx.showLoading({ title: '删除中...' })
              const result = await api.adminDeleteActivity(activityId)
              wx.hideLoading()

              if (result.success) {
                wx.showToast({ title: '删除成功', icon: 'success' })
                this.loadActivities()
              } else {
                wx.showToast({ title: result.message || '删除失败', icon: 'none' })
              }
            } catch (error) {
              wx.hideLoading()
              wx.showToast({ title: '网络错误', icon: 'none' })
            }
          }
        })
      }
    })
  },


  onPullDownRefresh() {
    this.loadActivities().then(() => wx.stopPullDownRefresh())
  }
})
