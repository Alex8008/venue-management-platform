const api = require('../../utils/api')

Page({
  data: {
    productId: 0,
    isEdit: false,
    product: {
      name: '',
      description: '',
      price: 0,
      stock: 0,
      category: '',
      image_url: ''
    },
    uploading: false,
    categoryOptions: [],
    selectedCategoryIndex: 0
  },

  onLoad(options) {
    this.loadCategories()
    if (options.id) {
      this.setData({
        productId: parseInt(options.id),
        isEdit: true
      })
      this.loadProduct()
    }
  },

  // 加载商品分类
  loadCategories() {
    const app = getApp()
    wx.request({
      url: `${app.globalData.apiUrl}/api/product-categories`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          const categories = res.data.data || []
          const categoryNames = categories.map(c => c.category_name)
          this.setData({
            categoryOptions: categoryNames
          })
          // 如果已有商品分类，设置选中索引
          if (this.data.product.category) {
            const index = categoryNames.indexOf(this.data.product.category)
            if (index !== -1) {
              this.setData({ selectedCategoryIndex: index })
            }
          }
        }
      }
    })
  },

  onCategoryChange(e) {
    const index = e.detail.value
    this.setData({
      selectedCategoryIndex: index,
      'product.category': this.data.categoryOptions[index]
    })
  },

  async loadProduct() {
    try {
      wx.showLoading({ title: '加载中...' })
      const result = await api.getProductDetail(this.data.productId)
      
      if (result.success) {
        this.setData({
          product: result.data
        })
        // 设置分类选中索引
        if (result.data.category && this.data.categoryOptions.length > 0) {
          const index = this.data.categoryOptions.indexOf(result.data.category)
          if (index !== -1) {
            this.setData({ selectedCategoryIndex: index })
          }
        }
      }
      
      wx.hideLoading()
    } catch (error) {
      wx.hideLoading()
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
      [`product.${field}`]: value
    })
  },

  onChooseImage() {
    if (this.data.uploading) {
      wx.showToast({
        title: '正在上传中...',
        icon: 'none'
      })
      return
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        this.setData({ uploading: true })
        wx.showLoading({ title: '上传中...', mask: true })
        
        try {
          const result = await api.uploadImage(res.tempFilePaths[0])
          
          if (result.success) {
            this.setData({
              'product.image_url': result.data.image_url,
              uploading: false
            })
            wx.hideLoading()
            wx.showToast({
              title: '上传成功',
              icon: 'success'
            })
          } else {
            this.setData({ uploading: false })
            wx.hideLoading()
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            })
          }
        } catch (error) {
          this.setData({ uploading: false })
          wx.hideLoading()
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          })
        }
      }
    })
  },

  async onSave() {
    const { name, price, stock } = this.data.product
    
    if (!name) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' })
      return
    }
    
    if (!price || price <= 0) {
      wx.showToast({ title: '请输入正确的价格', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })

    try {
      const productData = {
        ...this.data.product,
        price: parseFloat(this.data.product.price),
        stock: parseInt(this.data.product.stock) || 0,
        status: 'active'
      }

      let result
      if (this.data.isEdit) {
        result = await api.adminUpdateProduct(this.data.productId, productData)
      } else {
        result = await api.adminCreateProduct(productData)
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