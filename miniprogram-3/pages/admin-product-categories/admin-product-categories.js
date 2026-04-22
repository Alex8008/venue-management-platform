const app = getApp()

Page({
  data: {
    categories: [],
    loading: false,
    showModal: false,
    editId: null,
    formData: {
      category_name: '',
      sort_order: 0
    }
  },

  onLoad() {
    this.loadCategories()
  },

  onShow() {
    this.loadCategories()
  },

  loadCategories() {
    this.setData({ loading: true })

    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }

    wx.request({
      url: `${app.globalData.apiUrl}/api/product-categories`,
      method: 'GET',
      header: header,
      success: (res) => {
        this.setData({ loading: false })
        if (res.data.code === 200) {
          this.setData({ categories: res.data.data || [] })
        }
      },
      fail: () => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  onAdd() {
    this.setData({
      showModal: true,
      editId: null,
      formData: { category_name: '', sort_order: 0 }
    })
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id
    const category = this.data.categories.find(c => c.id === id)
    if (category) {
      this.setData({
        showModal: true,
        editId: id,
        formData: {
          category_name: category.category_name,
          sort_order: category.sort_order || 0
        }
      })
    }
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除分类',
      content: '确认删除此分类吗？',
      confirmColor: '#ff5722',
      success: (res) => {
        if (res.confirm) {
          const openid = wx.getStorageSync('openid')
          const userId = wx.getStorageSync('userId')
          const header = { 'Content-Type': 'application/json' }
          if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }

          wx.request({
            url: `${app.globalData.apiUrl}/api/product-categories/${id}`,
            method: 'DELETE',
            header: header,
            success: (res) => {
              if (res.data.code === 200) {
                wx.showToast({ title: '删除成功', icon: 'success' })
                this.loadCategories()
              }
            }
          })
        }
      }
    })
  },

  onNameInput(e) {
    this.setData({ 'formData.category_name': e.detail.value })
  },

  onOrderInput(e) {
    this.setData({ 'formData.sort_order': e.detail.value })
  },

  onConfirm() {
    if (!this.data.formData.category_name.trim()) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' })
      return
    }

    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }

    const method = this.data.editId ? 'PUT' : 'POST'
    const url = this.data.editId
      ? `${app.globalData.apiUrl}/api/product-categories/${this.data.editId}`
      : `${app.globalData.apiUrl}/api/product-categories`

    wx.showLoading({ title: '保存中...' })
    wx.request({
      url: url,
      method: method,
      header: header,
      data: {
        category_name: this.data.formData.category_name.trim(),
        sort_order: parseInt(this.data.formData.sort_order) || 0
      },
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          wx.showToast({ title: '保存成功', icon: 'success' })
          this.onCloseModal()
          this.loadCategories()
        } else {
          wx.showToast({ title: res.data.message || '保存失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  onCloseModal() {
    this.setData({
      showModal: false,
      editId: null,
      formData: { category_name: '', sort_order: 0 }
    })
  },

  stopPropagation() {}
})
