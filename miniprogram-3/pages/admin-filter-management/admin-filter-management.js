const app = getApp()

Page({
  data: {
    categories: [],
    loading: false,
    showModal: false,
    editId: null,
    formData: {
      category_name: '',
      description: ''
    }
  },

  onLoad() {
    this.loadCategories()
  },

  onShow() {
    this.loadCategories()
  },

  // 加载分类列表
  loadCategories() {
    this.setData({ loading: true })

    wx.request({
      url: `${app.globalData.apiUrl}/api/filter-categories`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({
            categories: res.data.data || [],
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
        console.error('加载分类失败:', err)
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
      formData: {
        category_name: '',
        description: ''
      }
    })
  },

  // 编辑
  onEdit(e) {
    const id = e.currentTarget.dataset.id
    const category = this.data.categories.find(c => c.id === id)

    if (category) {
      this.setData({
        showModal: true,
        editId: id,
        formData: {
          category_name: category.category_name,
          description: category.description || ''
        }
      })
    }
  },

  // 删除
  onDelete(e) {
    const id = e.currentTarget.dataset.id

    wx.showModal({
      title: '删除分类',
      content: '确认删除此分类吗？',
      confirmColor: '#ff5722',
      success: (res) => {
        if (res.confirm) {
          this.deleteCategory(id)
        }
      }
    })
  },

  deleteCategory(id) {
    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }
    wx.showLoading({ title: '删除中...' })

    wx.request({
      url: `${app.globalData.apiUrl}/api/filter-categories/${id}`,
      method: 'DELETE',
      header: header,
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
          this.loadCategories()
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

  // 输入
  onNameInput(e) {
    this.setData({
      'formData.category_name': e.detail.value
    })
  },

  onDescInput(e) {
    this.setData({
      'formData.description': e.detail.value
    })
  },

  // 确认
  onConfirm() {
    if (!this.data.formData.category_name.trim()) {
      wx.showToast({
        title: '请输入分类名称',
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
      ? `${app.globalData.apiUrl}/api/filter-categories/${this.data.editId}`
      : `${app.globalData.apiUrl}/api/filter-categories`

    wx.showLoading({ title: '保存中...' })
    wx.request({
      url: url,
      method: method,
      header: header,
      data: this.data.formData,
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          this.onCloseModal()
          this.loadCategories()
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
      formData: {
        category_name: '',
        description: ''
      }
    })
  },

  stopPropagation() {}
})
