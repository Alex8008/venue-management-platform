const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    searchValue: '',
    currentCategory: '',
    categories: [],
    products: [],
    cart: [],
    cartCount: 0,
    defaultAddress: null,
    loading: false,
    page: 1,
    hasMore: true,
    showTeacherModal: false,
    teachers: [],
    pendingProductId: null
  },

  onLoad() {
    this.loadCategories()
    this.loadProducts()
    this.loadCart()
    this.loadDefaultAddress()
  },

  onShow() {
    this.loadCart()
    this.loadDefaultAddress()
  },

  async loadDefaultAddress() {
    try {
      const result = await api.getAddresses()

      if (result.success) {
        const addresses = result.data || []
        const defaultAddr = addresses.find(a => a.is_default) || addresses[0]
        this.setData({
          defaultAddress: defaultAddr || null
        })
      }
    } catch (error) {
      console.error('加载地址失败:', error)
    }
  },

  onManageAddress() {
    wx.navigateTo({
      url: '/pages/address-manage/address-manage'
    })
  },

  onPullDownRefresh() {
    this.setData({
      products: [],
      page: 1,
      hasMore: true
    })
    this.loadProducts()
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadProducts()
    }
  },

  // 加载商品分类
  async loadCategories() {
    try {
      wx.request({
        url: `${app.globalData.apiUrl}/api/product-categories`,
        method: 'GET',
        success: (res) => {
          if (res.data.code === 200) {
            this.setData({
              categories: res.data.data || []
            })
          }
        }
      })
    } catch (error) {
      console.error('加载分类失败:', error)
    }
  },

  // 分类点击
  onCategoryClick(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      currentCategory: category,
      products: [],
      page: 1,
      hasMore: true
    })
    this.loadProducts()
  },

  async loadProducts() {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      const params = {
        search: this.data.searchValue,
        category: this.data.currentCategory,
        page: this.data.page,
        limit: 10
      }

      const result = await api.getProducts(params)

      if (result.success) {
        const newProducts = result.data || []
        this.setData({
          products: this.data.page === 1 ? newProducts : [...this.data.products, ...newProducts],
          page: this.data.page + 1,
          hasMore: newProducts.length === 10
        })
      }
    } catch (error) {
      console.error('加载商品失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }

    this.setData({ loading: false })
  },

  async loadCart() {
    try {
      const result = await api.getCart()
      if (result.success) {
        const cart = result.data || []
        const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
        this.setData({
          cart,
          cartCount
        })
      }
    } catch (error) {
      console.error('加载购物车失败:', error)
    }
  },

  onSearchInput(e) {
    this.setData({
      searchValue: e.detail.value
    })
  },

  onSearch() {
    this.setData({
      products: [],
      page: 1,
      hasMore: true
    })
    this.loadProducts()
  },

  async onAddToCart(e) {
    const productId = e.currentTarget.dataset.id
    const category = e.currentTarget.dataset.category

    // 如果是餐饮服务类商品，显示教练选择弹窗
    if (category === '餐饮服务') {
      this.setData({
        pendingProductId: productId
      })
      this.loadTeachers()
      return
    }

    // 普通商品直接加入购物车
    this.addToCartDirect(productId)
  },

  async addToCartDirect(productId) {
    try {
      wx.showLoading({ title: '添加中...' })

      const result = await api.addToCart({
        product_id: productId,
        quantity: 1
      })

      wx.hideLoading()

      if (result.success) {
        wx.showToast({
          title: '已添加到购物车',
          icon: 'success'
        })
        this.loadCart()
      } else {
        wx.showToast({
          title: result.message || '添加失败',
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
  },

  // 加载教练列表
  async loadTeachers() {
    try {
      wx.showLoading({ title: '加载中...' })

      wx.request({
        url: `${app.globalData.apiUrl}/api/teachers`,
        method: 'GET',
        success: (res) => {
          wx.hideLoading()
          if (res.data.code === 200) {
            this.setData({
              teachers: res.data.data || [],
              showTeacherModal: true
            })
          } else {
            wx.showToast({
              title: res.data.message || '加载教练失败',
              icon: 'none'
            })
          }
        },
        fail: (err) => {
          wx.hideLoading()
          console.error('加载教练失败:', err)
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          })
        }
      })
    } catch (error) {
      wx.hideLoading()
      console.error('加载教练失败:', error)
    }
  },

  // 选择教练后加入购物车（不再直接创建配送单）
  async onSelectTeacher(e) {
    const teacherId = e.currentTarget.dataset.teacherId
    const productId = this.data.pendingProductId


    if (!productId) return


    try {
      wx.showLoading({ title: '添加中...' })


      const result = await api.addToCart({
        product_id: productId,
        quantity: 1,
        delivery_teacher_id: teacherId
      })


      wx.hideLoading()


      if (result.success) {
        wx.showToast({
          title: '已添加到购物车',
          icon: 'success'
        })
        this.onCloseModal()
        this.loadCart()
      } else {
        wx.showToast({
          title: result.message || '添加失败',
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
  },


  // 关闭弹窗
  onCloseModal() {
    this.setData({
      showTeacherModal: false,
      teachers: [],
      pendingProductId: null
    })
  },

  // 阻止冒泡
  stopPropagation() {},

  onProductClick(e) {
    const productId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-detail/product-detail?id=${productId}`
    })
  },

  onCartClick() {
    wx.navigateTo({
      url: '/pages/cart/cart'
    })
  },

  onCreateOrder() {
    this.onCartClick()
  }
})
