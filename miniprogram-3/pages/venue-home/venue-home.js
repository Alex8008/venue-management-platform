// pages/venue-home/venue-home.js
const app = getApp()

Page({
  data: {
    carouselList: [],
    contentList: []
  },

  onLoad(options) {
    this.loadCarousel()
    this.loadContent()
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadCarousel()
    this.loadContent()
  },

  onPullDownRefresh() {
    this.loadCarousel()
    this.loadContent()
    wx.stopPullDownRefresh()
  },

  // 加载轮播图（合并首页内容轮播 + 活动管理轮播）
  loadCarousel() {
    const that = this
    let venueCarousels = []
    let activityCarousels = []
    let venueLoaded = false
    let activityLoaded = false

    const mergeAndSet = () => {
      if (!venueLoaded || !activityLoaded) return

      // 收集 venue_content 中已关联的活动ID，用于去重
      const linkedActivityIds = new Set()
      venueCarousels.forEach(item => {
        if (item.link_type === 'activity' && item.link_id) {
          linkedActivityIds.add(Number(item.link_id))
        }
      })

      // 将活动轮播转换为 venue_content 格式，排除已关联的
      const convertedActivities = activityCarousels
        .filter(act => !linkedActivityIds.has(Number(act.id)))
        .map(act => ({
          id: 'act_' + act.id,
          content_type: 'carousel',
          title: act.title || '',
          image_url: act.cover_image_url || '',
          link_type: 'activity',
          link_id: act.id,
          sort_order: act.sort_order || 0
        }))

      // 合并并按 sort_order 排序
      const merged = venueCarousels.concat(convertedActivities)
      merged.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

      that.setData({ carouselList: merged })
    }

    // 请求1：首页内容管理的轮播
    wx.request({
      url: `${app.globalData.apiUrl}/api/venue-content`,
      method: 'GET',
      data: { content_type: 'carousel' },
      success: (res) => {
        if (res.data.code === 200) {
          venueCarousels = res.data.data || []
        }
      },
      complete: () => {
        venueLoaded = true
        mergeAndSet()
      }
    })

    // 请求2：活动管理中设置的轮播活动
    wx.request({
      url: `${app.globalData.apiUrl}/api/activities/carousel`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          activityCarousels = res.data.data || []
        }
      },
      complete: () => {
        activityLoaded = true
        mergeAndSet()
      }
    })
  },

  // 加载其他内容
  loadContent() {
    wx.request({
      url: `${app.globalData.apiUrl}/api/venue-content`,
      method: 'GET',
      data: {
        content_type: '' // 获取所有类型
      },
      success: (res) => {
        if (res.data.code === 200) {
          // 过滤掉轮播图，只保留其他内容
          const allContent = res.data.data || []
          const filteredContent = allContent.filter(item => item.content_type !== 'carousel')
          this.setData({
            contentList: filteredContent
          })
        }
      },
      fail: (err) => {
        console.error('加载内容失败:', err)
      }
    })
  },

  // 轮播图点击
  onCarouselTap(e) {
    const item = e.currentTarget.dataset.item
    this.handleContentJump(item)
  },

  // 内容点击
  onContentTap(e) {
    const item = e.currentTarget.dataset.item
    this.handleContentJump(item)
  },

  // 处理内容跳转
  handleContentJump(item) {
    if (!item.link_type || !item.link_id) {
      return
    }

    // 根据链接类型跳转
    if (item.link_type === 'activity') {
      wx.navigateTo({
        url: `/pages/activity-detail/activity-detail?id=${item.link_id}`
      })
    } else if (item.link_type === 'course') {
      wx.navigateTo({
        url: `/pages/group-course-detail/group-course-detail?id=${item.link_id}`
      })
    } else if (item.link_type === 'product') {
      wx.navigateTo({
        url: `/pages/product-detail/product-detail?id=${item.link_id}`
      })
    }
  }
})
