const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    contents: [],
    loading: false,
    showModal: false,
    editId: null,
    typeOptions: [
      { label: '轮播图', value: 'carousel' },
      { label: '横幅图片', value: 'banner' },
      { label: '文字内容', value: 'text' },
      { label: '活动推荐', value: 'activity' }
    ],
    linkTypeOptions: [
      { label: '无链接', value: '' },
      { label: '活动', value: 'activity' },
      { label: '课程', value: 'course' },
      { label: '商品', value: 'product' }
    ],
    typeIndex: 0,
    linkTypeIndex: 0,
    linkItems: [],
    filteredLinkItems: [],
    linkSearchValue: '',
    selectedLinkItem: null,
    formData: {
      content_type: 'carousel',
      title: '',
      image_url: '',
      content: '',
      link_type: '',
      link_id: '',
      sort_order: 0,
      is_active: true
    }
  },

  onLoad() {
    this.loadContents()
  },

  onShow() {
    this.loadContents()
  },

  // 加载内容列表
  loadContents() {
    this.setData({ loading: true })

    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }
    wx.request({
      url: `${app.globalData.apiUrl}/api/venue-content`,
      method: 'GET',
      header: header,
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({
            contents: res.data.data || [],
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
        console.error('加载内容失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  // 新建
  onAdd() {
    this.setData({
      showModal: true,
      editId: null,
      typeIndex: 0,
      linkTypeIndex: 0,
      formData: {
        content_type: 'carousel',
        title: '',
        image_url: '',
        content: '',
        link_type: '',
        link_id: '',
        sort_order: 0,
        is_active: true
      }
    })
  },

  // 编辑
  onEdit(e) {
    const id = e.currentTarget.dataset.id
    const content = this.data.contents.find(c => c.id === id)

    if (content) {
      const typeIndex = this.data.typeOptions.findIndex(t => t.value === content.content_type)
      const linkTypeIndex = this.data.linkTypeOptions.findIndex(t => t.value === (content.link_type || ''))
      this.setData({
        showModal: true,
        editId: id,
        typeIndex: typeIndex !== -1 ? typeIndex : 0,
        linkTypeIndex: linkTypeIndex !== -1 ? linkTypeIndex : 0,
        linkSearchValue: '',
        selectedLinkItem: content.link_id ? { id: content.link_id, title: content.link_title || `#${content.link_id}` } : null,
        formData: {
          content_type: content.content_type || 'carousel',
          title: content.title || '',
          image_url: content.image_url || '',
          content: content.content || '',
          link_type: content.link_type || '',
          link_id: content.link_id ? String(content.link_id) : '',
          sort_order: content.sort_order || 0,
          is_active: content.is_active ? true : false
        }
      })
      // 加载关联列表
      if (content.link_type) {
        this.loadLinkItems(content.link_type)
      }
    }
  },

  // 切换状态
  onToggle(e) {
    const id = e.currentTarget.dataset.id
    const isActive = e.currentTarget.dataset.active

    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }
    wx.showLoading({ title: '处理中...' })

    wx.request({
      url: `${app.globalData.apiUrl}/api/venue-content/${id}`,
      method: 'PUT',
      header: header,
      data: {
        is_active: !isActive
      },
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          wx.showToast({
            title: !isActive ? '已启用' : '已停用',
            icon: 'success'
          })
          this.loadContents()
        } else {
          wx.showToast({
            title: res.data.message || '操作失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('切换状态失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  // 删除
  onDelete(e) {
    const id = e.currentTarget.dataset.id

    wx.showModal({
      title: '删除内容',
      content: '确认删除此内容吗？',
      confirmColor: '#ff5722',
      success: (res) => {
        if (res.confirm) {
          this.deleteContent(id)
        }
      }
    })
  },

  deleteContent(id) {
    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }
    wx.showLoading({ title: '删除中...' })

    wx.request({
      url: `${app.globalData.apiUrl}/api/venue-content/${id}`,
      method: 'DELETE',
      header: header,
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
          this.loadContents()
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
  },

  // 表单输入
  onTypeChange(e) {
    const index = e.detail.value
    this.setData({
      typeIndex: index,
      'formData.content_type': this.data.typeOptions[index].value
    })
  },

  onLinkTypeChange(e) {
    const index = e.detail.value
    const linkType = this.data.linkTypeOptions[index].value
    this.setData({
      linkTypeIndex: index,
      'formData.link_type': linkType,
      'formData.link_id': '',
      linkItems: [],
      filteredLinkItems: [],
      linkSearchValue: '',
      selectedLinkItem: null
    })
    if (linkType) {
      this.loadLinkItems(linkType)
    }
  },

  // 加载发布类型关联列表
  loadLinkItems(type, search) {
    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }

    let url = `${app.globalData.apiUrl}/api/venue-content/link-options?type=${type}`
    if (search) {
      url += `&search=${encodeURIComponent(search)}`
    }

    wx.request({
      url: url,
      method: 'GET',
      header: header,
      success: (res) => {
        if (res.data.code === 200) {
          const items = res.data.data || []
          this.setData({
            linkItems: items,
            filteredLinkItems: items
          })
        }
      }
    })
  },

  // 搜索关联内容
  onLinkSearch(e) {
    const value = e.detail.value
    this.setData({ linkSearchValue: value })
    if (this.data.formData.link_type) {
      this.loadLinkItems(this.data.formData.link_type, value)
    }
  },

  // 选择关联内容
  onSelectLinkItem(e) {
    const id = e.currentTarget.dataset.id
    const title = e.currentTarget.dataset.title
    const updates = {
      'formData.link_id': id,
      selectedLinkItem: { id, title }
    }

    // 如果标题为空，自动填充关联项的标题
    if (!this.data.formData.title.trim()) {
      updates['formData.title'] = title || ''
    }

    // 如果图片为空，自动填充关联项的图片
    if (!this.data.formData.image_url) {
      const item = this.data.linkItems.find(i => i.id === id)
      if (item && item.image_url) {
        updates['formData.image_url'] = item.image_url
      }
    }

    this.setData(updates)
  },

  // 清除已选关联内容
  onClearLinkItem() {
    this.setData({
      'formData.link_id': '',
      selectedLinkItem: null
    })
  },

  onTitleInput(e) {
    this.setData({
      'formData.title': e.detail.value
    })
  },

  onContentInput(e) {
    this.setData({
      'formData.content': e.detail.value
    })
  },

  onLinkIdInput(e) {
    this.setData({
      'formData.link_id': e.detail.value
    })
  },

  onOrderInput(e) {
    this.setData({
      'formData.sort_order': e.detail.value
    })
  },

  onStatusChange(e) {
    this.setData({
      'formData.is_active': e.detail.value
    })
  },

  // 选择图片
  onChooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        this.uploadImage(tempFilePath)
      }
    })
  },

  // 上传图片
  async uploadImage(filePath) {
    wx.showLoading({ title: '上传中...' })
    try {
      const result = await api.uploadImage(filePath)
      wx.hideLoading()
      if (result.success) {
        this.setData({
          'formData.image_url': result.data.image_url
        })
        wx.showToast({ title: '上传成功', icon: 'success' })
      } else {
        wx.showToast({ title: result.message || '上传失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('上传图片失败:', err)
      wx.showToast({ title: '上传失败', icon: 'none' })
    }
  },

  // 获取内容类型中文名
  getContentTypeName(type) {
    const map = {
      'carousel': '轮播图',
      'banner': '横幅图片',
      'text': '文字内容',
      'activity': '活动推荐'
    }
    return map[type] || type
  },

  // 确认
  onConfirm() {
    // 如果没有关联项且标题为空，提示输入标题
    const hasLink = this.data.formData.link_type && this.data.formData.link_id
    if (!this.data.formData.title.trim() && !hasLink) {
      wx.showToast({
        title: '请输入标题或选择关联内容',
        icon: 'none'
      })
      return
    }

    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }
    const method = this.data.editId ? 'PUT' : 'POST'
    const url = this.data.editId
      ? `${app.globalData.apiUrl}/api/venue-content/${this.data.editId}`
      : `${app.globalData.apiUrl}/api/venue-content`

    // 构建提交数据
    const submitData = {
      content_type: this.data.formData.content_type,
      title: this.data.formData.title,
      image_url: this.data.formData.image_url,
      content: this.data.formData.content,
      link_type: this.data.formData.link_type || '',
      link_id: this.data.formData.link_id ? parseInt(this.data.formData.link_id) : null,
      sort_order: parseInt(this.data.formData.sort_order) || 0,
      is_active: this.data.formData.is_active
    }

    wx.showLoading({ title: '保存中...' })
    wx.request({
      url: url,
      method: method,
      header: header,
      data: submitData,
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          this.onCloseModal()
          this.loadContents()
        } else {
          wx.showToast({
            title: res.data.message || '保存失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('保存失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  // 关闭弹窗
  onCloseModal() {
    this.setData({
      showModal: false,
      editId: null,
      typeIndex: 0,
      linkTypeIndex: 0,
      linkItems: [],
      filteredLinkItems: [],
      linkSearchValue: '',
      selectedLinkItem: null,
      formData: {
        content_type: 'carousel',
        title: '',
        image_url: '',
        content: '',
        link_type: '',
        link_id: '',
        sort_order: 0,
        is_active: true
      }
    })
  },

  stopPropagation() {}
})
