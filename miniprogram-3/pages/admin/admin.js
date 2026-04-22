const api = require('../../utils/api')

Page({
  data: {
    statistics: {},
    activities: [],
    allActivities: [],
    pendingRegistrations: [],
    users: [],
    allUsers: [],
    products: [],
    allProducts: [],
    insuranceSubmissions: [],
    refundRequests: [],
    currentTab: 0,
    tabs: ['统计概览', '首页管理', '活动管理', '课程管理', '报名审核', '用户管理', '商品管理', '会员卡管理', '保险审核', '退款审核', '操作日志', '错误日志', '数据备份'],
    activitySearchValue: '',
    userSearchValue: '',
    productSearchValue: '',
    courseSearchValue: '',
    selectedRegistrations: [],
    allRegistrationsSelected: false,
    selectedInsurance: [],
    allInsuranceSelected: false,
    selectedRefunds: [],
    allRefundsSelected: false,
    showSortDialog: false,
    sortableActivities: [],
    operationLogs: [],
    errorLogs: [],
    courses: [],
    allCourses: [],
    membershipCards: [],
    refreshing: false,
    carouselActivities: [],
    adminUsers: [],
    teacherUsers: [],
    normalUsers: [],
    registrationViewType: 'activity',
    pendingCourseBookings: [],
    selectedCourseBookings: [],
    allCourseBookingsSelected: false,
    isRegistrationSelectionMode: false,
    isCourseBookingSelectionMode: false,
    isInsuranceSelectionMode: false,
    isRefundSelectionMode: false,
    isCourseRefundSelectionMode: false,
    refundViewType: 'activity',
    courseRefundBookings: [],
    selectedCourseRefunds: [],
    allCourseRefundsSelected: false,
    productRefundOrders: [],
    selectedProductRefunds: [],
    allProductRefundsSelected: false,
    isProductRefundSelectionMode: false,
    showGiftModal: false,
    giftCardId: null,
    giftUserList: [],
    giftUserListAll: [],
    allGiftUsersSelected: false
  },

  onLoad() {
    this.loadStatistics()
    this.loadActivities()
    this.loadPendingRegistrations()
    this.loadPendingCourseBookings()
  },

  async onRefresh() {
    this.setData({ refreshing: true })
    
    switch (this.data.currentTab) {
      case 0:
        await this.loadStatistics()
        break
      case 1:
        await this.loadCarouselActivities()
        break
      case 2:
        await this.loadActivities()
        break
      case 3:
        await this.loadCourses()
        break
      case 4:
        await this.loadPendingRegistrations()
        await this.loadPendingCourseBookings()
        break
      case 5:
        await this.loadUsers()
        break
      case 6:
        await this.loadProducts()
        break
      case 7:
        await this.loadMembershipCards()
        break
      case 8:
        await this.loadInsuranceSubmissions()
        break
      case 9:
        await this.loadRefundRequests()
        await this.loadCourseRefundBookings()
        break
      case 10:
        await this.loadOperationLogs()
        break
      case 11:
        await this.loadErrorLogs()
        break
    }
    
    setTimeout(() => {
      this.setData({ refreshing: false })
    }, 500)
  },

  onRestore() {
    this.setData({ refreshing: false })
  },

  async loadStatistics() {
    try {
      const result = await api.adminGetStatistics()
      if (result.success) {
        this.setData({
          statistics: result.data
        })
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
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

  async loadPendingRegistrations() {
    try {
      const result = await api.adminGetRegistrations({ status: 'pending' })
      if (result.success) {
        this.setData({
          pendingRegistrations: result.data || []
        })
      }
    } catch (error) {
      console.error('加载待审核报名失败:', error)
    }
  },

  async loadUsers() {
    try {
      const result = await api.adminGetUsers()
      if (result.success) {
        const allUsers = result.data || []
        this.setData({
          users: allUsers,
          allUsers: allUsers
        })
        this.groupUsers(allUsers)
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
    }
  },

  groupUsers(userList) {
    const adminUsers = userList.filter(u => u.user_type === 'admin')
    const teacherUsers = userList.filter(u => u.user_type === 'teacher')
    const normalUsers = userList.filter(u => u.user_type !== 'teacher' && u.user_type !== 'admin')
    this.setData({ adminUsers, teacherUsers, normalUsers })
  },


  async loadProducts() {
    try {
      const result = await api.adminGetProducts()
      if (result.success) {
        this.setData({
          products: result.data || [],
          allProducts: result.data || []
        })
      }
    } catch (error) {
      console.error('加载商品列表失败:', error)
    }
  },

  async loadInsuranceSubmissions() {
    try {
      const result = await api.adminGetInsuranceSubmissions({ status: 'pending' })
      if (result.success) {
        this.setData({
          insuranceSubmissions: result.data || []
        })
      }
    } catch (error) {
      console.error('加载保险审核失败:', error)
    }
  },

  async loadRefundRequests() {
    try {
      const result = await api.adminGetRefunds({ status: 'pending', type: 'activity' })
      if (result.success) {
        this.setData({
          refundRequests: result.data || []
        })
      }
      // 同时加载商品退款
      const productResult = await api.adminGetRefunds({ status: 'pending', type: 'product' })
      if (productResult.success) {
        this.setData({
          productRefundOrders: productResult.data || []
        })
      }
    } catch (error) {
      console.error('加载退款申请失败:', error)
    }
  },

  async loadOperationLogs() {
    try {
      const result = await api.adminGetOperationLogs({ page: 1, limit: 50 })
      
      if (result.success) {
        this.setData({
          operationLogs: result.data || []
        })
      }
    } catch (error) {
      console.error('加载操作日志失败:', error)
      wx.showToast({
        title: '加载日志失败',
        icon: 'none'
      })
    }
  },

  async loadErrorLogs() {
    try {
      const result = await api.adminGetErrorLogs({ page: 1, limit: 50 })
      
      if (result.success) {
        this.setData({
          errorLogs: result.data || []
        })
      }
    } catch (error) {
      console.error('加载错误日志失败:', error)
      wx.showToast({
        title: '加载日志失败',
        icon: 'none'
      })
    }
  },

  onTabClick(e) {
    const tabIndex = e.currentTarget.dataset.index
    this.setData({
      currentTab: tabIndex
    })

    switch (tabIndex) {
      case 1:
        this.loadCarouselActivities()
        break
      case 2:
        this.loadActivities()
        break
      case 3:
        this.loadCourses()
        break
      case 4:
        this.loadPendingRegistrations()
        this.loadPendingCourseBookings()
        break
      case 5:
        this.loadUsers()
        break
      case 6:
        this.loadProducts()
        break
      case 7:
        this.loadMembershipCards()
        break
      case 8:
        this.loadInsuranceSubmissions()
        break
      case 9:
        this.loadRefundRequests()
        this.loadCourseRefundBookings()
        break
      case 10:
        this.loadOperationLogs()
        break
      case 11:
        this.loadErrorLogs()
        break
    }
  },

  onActivitySearchInput(e) {
    this.setData({
      activitySearchValue: e.detail.value
    })
  },

  onActivitySearch() {
    const searchValue = this.data.activitySearchValue.toLowerCase()
    
    if (!searchValue) {
      this.setData({
        activities: this.data.allActivities
      })
      return
    }

    const filtered = this.data.allActivities.filter(activity => 
      activity.title.toLowerCase().includes(searchValue)
    )
    
    this.setData({
      activities: filtered
    })
  },

  onUserSearchInput(e) {
    this.setData({
      userSearchValue: e.detail.value
    })
  },

  onUserSearch() {
    const searchValue = this.data.userSearchValue.toLowerCase()

    if (!searchValue) {
      this.setData({
        users: this.data.allUsers
      })
      this.groupUsers(this.data.allUsers)
      return
    }

    const filtered = this.data.allUsers.filter(user =>
      (user.real_name && user.real_name.toLowerCase().includes(searchValue)) ||
      (user.phone && user.phone.includes(searchValue))
    )

    this.setData({
      users: filtered
    })
    this.groupUsers(filtered)
  },

  onProductSearchInput(e) {
    this.setData({
      productSearchValue: e.detail.value
    })
  },

  onProductSearch() {
    const searchValue = this.data.productSearchValue.toLowerCase()
    
    if (!searchValue) {
      this.setData({
        products: this.data.allProducts
      })
      return
    }

    const filtered = this.data.allProducts.filter(product => 
      product.name.toLowerCase().includes(searchValue)
    )
    
    this.setData({
      products: filtered
    })
  },

  onSelectAllRegistrations() {
    const allSelected = !this.data.allRegistrationsSelected
    const pendingRegistrations = this.data.pendingRegistrations.map(item => ({
      ...item, selected: allSelected
    }))
    const selectedRegistrations = allSelected ? pendingRegistrations.map(r => r.id) : []

    this.setData({
      allRegistrationsSelected: allSelected,
      pendingRegistrations,
      selectedRegistrations
    })
  },

  onSelectRegistration(e) {
    const itemId = parseInt(e.currentTarget.dataset.id)
    const pendingRegistrations = this.data.pendingRegistrations.map(item => {
      if (item.id === itemId) {
        return { ...item, selected: !item.selected }
      }
      return item
    })
    const selectedRegistrations = pendingRegistrations.filter(item => item.selected).map(item => item.id)

    this.setData({
      pendingRegistrations,
      selectedRegistrations,
      allRegistrationsSelected: selectedRegistrations.length === pendingRegistrations.length
    })
  },

  // ==================== 保险审核选择模式 ====================
  onToggleInsuranceSelectionMode() {
    const entering = !this.data.isInsuranceSelectionMode
    const insuranceSubmissions = this.data.insuranceSubmissions.map(item => ({
      ...item, selected: false
    }))
    this.setData({
      isInsuranceSelectionMode: entering,
      insuranceSubmissions,
      selectedInsurance: [],
      allInsuranceSelected: false
    })
  },

  onInsuranceCardTap(e) {
    if (this.data.isInsuranceSelectionMode) {
      this.onSelectInsurance(e)
    } else {
      const imageUrl = e.currentTarget.dataset.url
      if (imageUrl) {
        wx.previewImage({
          urls: [imageUrl],
          current: imageUrl
        })
      }
    }
  },

  onSelectAllInsurance() {
    const allSelected = !this.data.allInsuranceSelected
    const insuranceSubmissions = this.data.insuranceSubmissions.map(item => ({
      ...item, selected: allSelected
    }))
    const selectedInsurance = allSelected ? insuranceSubmissions.map(item => item.id) : []
    this.setData({
      insuranceSubmissions,
      selectedInsurance,
      allInsuranceSelected: allSelected
    })
  },

  onSelectInsurance(e) {
    const itemId = parseInt(e.currentTarget.dataset.id)
    const insuranceSubmissions = this.data.insuranceSubmissions.map(item => {
      if (item.id === itemId) {
        return { ...item, selected: !item.selected }
      }
      return item
    })
    const selectedInsurance = insuranceSubmissions.filter(item => item.selected).map(item => item.id)
    this.setData({
      insuranceSubmissions,
      selectedInsurance,
      allInsuranceSelected: selectedInsurance.length === insuranceSubmissions.length
    })
  },

  // ==================== 退款审核选择模式 ====================
  onToggleRefundSelectionMode() {
    const entering = !this.data.isRefundSelectionMode
    const refundRequests = this.data.refundRequests.map(item => ({
      ...item, selected: false
    }))
    this.setData({
      isRefundSelectionMode: entering,
      refundRequests,
      selectedRefunds: [],
      allRefundsSelected: false
    })
  },

  onRefundCardTap(e) {
    if (this.data.isRefundSelectionMode) {
      this.onSelectRefund(e)
    } else {
      const userId = e.currentTarget.dataset.userId
      const userName = e.currentTarget.dataset.name
      if (userId) {
        wx.navigateTo({
          url: `/pages/user-detail/user-detail?id=${userId}&name=${userName}`
        })
      }
    }
  },

  onSelectAllRefunds() {
    const allSelected = !this.data.allRefundsSelected
    const refundRequests = this.data.refundRequests.map(item => ({
      ...item, selected: allSelected
    }))
    const selectedRefunds = allSelected ? refundRequests.map(item => item.id) : []
    this.setData({
      refundRequests,
      selectedRefunds,
      allRefundsSelected: allSelected
    })
  },

  onSelectRefund(e) {
    const itemId = parseInt(e.currentTarget.dataset.id)
    const refundRequests = this.data.refundRequests.map(item => {
      if (item.id === itemId) {
        return { ...item, selected: !item.selected }
      }
      return item
    })
    const selectedRefunds = refundRequests.filter(item => item.selected).map(item => item.id)
    this.setData({
      refundRequests,
      selectedRefunds,
      allRefundsSelected: selectedRefunds.length === refundRequests.length
    })
  },

  async onBatchApprove() {
    if (this.data.selectedRegistrations.length === 0) {
      wx.showToast({
        title: '请选择要审核的项目',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '批量审核',
      content: `确定通过选中的 ${this.data.selectedRegistrations.length} 个报名吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })
          
          let successCount = 0
          for (const id of this.data.selectedRegistrations) {
            try {
              const result = await api.adminReviewRegistration(id, {
                status: 'approved',
                admin_notes: '批量审核通过'
              })
              if (result.success) {
                successCount++
              }
            } catch (error) {
              console.error(`审核ID ${id} 失败:`, error)
            }
          }
          
          wx.hideLoading()
          wx.showToast({
            title: `成功审核 ${successCount} 个`,
            icon: 'success'
          })
          
          this.setData({
            selectedRegistrations: [],
            allRegistrationsSelected: false,
            isRegistrationSelectionMode: false
          })

          this.loadPendingRegistrations()
          this.loadStatistics()
        }
      }
    })
  },

  async onBatchReject() {
    if (this.data.selectedRegistrations.length === 0) {
      wx.showToast({
        title: '请选择要审核的项目',
        icon: 'none'
      })
      return
    }
  
    wx.showModal({
      title: '批量拒绝',
      content: '请输入拒绝原因',
      editable: true,
      placeholderText: '请输入拒绝原因',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          wx.showLoading({ title: '处理中...' })
          
          const rejectReason = modalRes.content || '批量审核未通过'
          let successCount = 0
          
          for (const id of this.data.selectedRegistrations) {
            try {
              const result = await api.adminReviewRegistration(id, {
                status: 'rejected',
                admin_notes: rejectReason
              })
              if (result.success) {
                successCount++
              }
            } catch (error) {
              console.error(`拒绝ID ${id} 失败:`, error)
            }
          }
          
          wx.hideLoading()
          wx.showToast({
            title: `成功拒绝 ${successCount} 个`,
            icon: 'success'
          })
          
          this.setData({
            selectedRegistrations: [],
            allRegistrationsSelected: false,
            isRegistrationSelectionMode: false
          })

          this.loadPendingRegistrations()
          this.loadStatistics()
        }
      }
    })
  },

  async onBatchApproveInsurance() {
    if (this.data.selectedInsurance.length === 0) {
      wx.showToast({
        title: '请选择要审核的项目',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '批量审核',
      content: `确定通过选中的 ${this.data.selectedInsurance.length} 个保险凭证吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })
          
          let successCount = 0
          for (const id of this.data.selectedInsurance) {
            try {
              const result = await api.adminReviewInsurance(id, {
                status: 'approved',
                admin_notes: '批量审核通过'
              })
              if (result.success) {
                successCount++
              }
            } catch (error) {
              console.error(`审核ID ${id} 失败:`, error)
            }
          }
          
          wx.hideLoading()
          wx.showToast({
            title: `成功审核 ${successCount} 个`,
            icon: 'success'
          })
          
          this.setData({
            selectedInsurance: [],
            allInsuranceSelected: false,
            isInsuranceSelectionMode: false
          })

          this.loadInsuranceSubmissions()
        }
      }
    })
  },

  async onBatchRejectInsurance() {
    if (this.data.selectedInsurance.length === 0) {
      wx.showToast({
        title: '请选择要审核的项目',
        icon: 'none'
      })
      return
    }
  
    wx.showModal({
      title: '批量拒绝',
      content: '请输入拒绝原因',
      editable: true,
      placeholderText: '请输入拒绝原因',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          wx.showLoading({ title: '处理中...' })
          
          const rejectReason = modalRes.content || '批量审核未通过'
          let successCount = 0
          
          for (const id of this.data.selectedInsurance) {
            try {
              const result = await api.adminReviewInsurance(id, {
                status: 'rejected',
                admin_notes: rejectReason
              })
              if (result.success) {
                successCount++
              }
            } catch (error) {
              console.error(`拒绝ID ${id} 失败:`, error)
            }
          }
          
          wx.hideLoading()
          wx.showToast({
            title: `成功拒绝 ${successCount} 个`,
            icon: 'success'
          })
          
          this.setData({
            selectedInsurance: [],
            allInsuranceSelected: false,
            isInsuranceSelectionMode: false
          })

          this.loadInsuranceSubmissions()
        }
      }
    })
  },

  async onBatchApproveRefund() {
    if (this.data.selectedRefunds.length === 0) {
      wx.showToast({
        title: '请选择要审核的项目',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '批量退款',
      content: `确定同意选中的 ${this.data.selectedRefunds.length} 个退款申请吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })
          
          let successCount = 0
          for (const id of this.data.selectedRefunds) {
            try {
              const result = await api.adminReviewRefund(id, {
                status: 'approved',
                admin_notes: '批量同意退款',
                type: 'activity'
              })
              if (result.success) {
                successCount++
              }
            } catch (error) {
              console.error(`退款ID ${id} 失败:`, error)
            }
          }
          
          wx.hideLoading()
          wx.showToast({
            title: `成功处理 ${successCount} 个`,
            icon: 'success'
          })
          
          this.setData({
            selectedRefunds: [],
            allRefundsSelected: false,
            isRefundSelectionMode: false
          })

          this.loadRefundRequests()
          this.loadStatistics()
        }
      }
    })
  },

  async onBatchRejectRefund() {
    if (this.data.selectedRefunds.length === 0) {
      wx.showToast({
        title: '请选择要审核的项目',
        icon: 'none'
      })
      return
    }
  
    wx.showModal({
      title: '批量拒绝退款',
      content: '请输入拒绝原因',
      editable: true,
      placeholderText: '请输入拒绝原因',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          wx.showLoading({ title: '处理中...' })
          
          const rejectReason = modalRes.content || '批量拒绝退款'
          let successCount = 0
          
          for (const id of this.data.selectedRefunds) {
            try {
              const result = await api.adminReviewRefund(id, {
                status: 'rejected',
                admin_notes: rejectReason,
                type: 'activity'
              })
              if (result.success) {
                successCount++
              }
            } catch (error) {
              console.error(`拒绝ID ${id} 失败:`, error)
            }
          }
          
          wx.hideLoading()
          wx.showToast({
            title: `成功拒绝 ${successCount} 个`,
            icon: 'success'
          })
          
          this.setData({
            selectedRefunds: [],
            allRefundsSelected: false,
            isRefundSelectionMode: false
          })

          this.loadRefundRequests()
          this.loadStatistics()
        }
      }
    })
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

        // 二次确认
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
                this.loadStatistics()
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


  onViewUserDetail(e) {
    const userId = e.currentTarget.dataset.id
    const userName = e.currentTarget.dataset.name
    wx.navigateTo({
      url: `/pages/user-detail/user-detail?id=${userId}&name=${userName}`
    })
  },

  onUserClick(e) {
    const userId = e.currentTarget.dataset.id
    const userName = e.currentTarget.dataset.name
    wx.navigateTo({
      url: `/pages/user-detail/user-detail?id=${userId}&name=${userName}`
    })
  },

  onCreateProduct() {
    wx.navigateTo({
      url: '/pages/product-edit/product-edit'
    })
  },

  onEditProduct(e) {
    const productId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/product-edit/product-edit?id=${productId}`
    })
  },

  async onDeleteProduct(e) {
    const productId = e.currentTarget.dataset.id
    const product = this.data.products.find(p => p.id === productId)
    
    wx.showModal({
      title: '下架商品',
      content: `确定要下架"${product.name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' })
            
            const result = await api.adminDeleteProduct(productId)
            
            wx.hideLoading()
            
            if (result.success) {
              wx.showToast({
                title: '已下架',
                icon: 'success'
              })
              this.loadProducts()
            } else {
              wx.showToast({
                title: result.message || '操作失败',
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
      }
    })
  },

  onShowSortDialog() {
    const sortableActivities = this.data.activities.map((item, index) => ({
      id: item.id,
      title: item.title,
      sort_order: item.sort_order || 0,
      originalIndex: index
    }))

    this.setData({
      showSortDialog: true,
      sortableActivities
    })
  },

  onCloseSortDialog() {
    this.setData({
      showSortDialog: false
    })
  },

  doNothing() {
    // 阻止点击对话框内容时关闭
  },

  onMoveActivity(e) {
    const index = e.currentTarget.dataset.index
    const direction = e.currentTarget.dataset.direction
    const sortableActivities = [...this.data.sortableActivities]

    if (direction === 'up' && index > 0) {
      const temp = sortableActivities[index]
      sortableActivities[index] = sortableActivities[index - 1]
      sortableActivities[index - 1] = temp
    } else if (direction === 'down' && index < sortableActivities.length - 1) {
      const temp = sortableActivities[index]
      sortableActivities[index] = sortableActivities[index + 1]
      sortableActivities[index + 1] = temp
    }

    this.setData({
      sortableActivities
    })
  },

  async onSaveSortOrder() {
    try {
      wx.showLoading({ title: '保存中...' })

      const activityOrders = this.data.sortableActivities.map((item, index) => ({
        id: item.id,
        sort_order: index
      }))

      const result = await api.adminReorderActivities({
        activity_orders: activityOrders
      })

      wx.hideLoading()

      if (result.success) {
        wx.showToast({
          title: '排序保存成功',
          icon: 'success'
        })

        this.setData({
          showSortDialog: false
        })

        this.loadActivities()
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
  },

  async onManualBackup() {
    wx.showModal({
      title: '确认备份',
      content: '确定要立即备份数据库吗？此操作可能需要几分钟。',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '备份中...', mask: true })

          try {
            const result = await api.adminManualBackup()

            wx.hideLoading()

            if (result.success) {
              wx.showModal({
                title: '备份成功',
                content: '数据库备份已完成！备份文件已保存到服务器。',
                showCancel: false
              })
            } else {
              wx.showModal({
                title: '备份失败',
                content: result.message || '备份过程中发生错误',
                showCancel: false
              })
            }
          } catch (error) {
            wx.hideLoading()
            wx.showModal({
              title: '备份失败',
              content: '网络错误，请稍后重试',
              showCancel: false
            })
          }
        }
      }
    })
  },

  onManageCourseFilters() {
    wx.navigateTo({
      url: '/pages/admin-filter-management/admin-filter-management'
    })
  },

  onManageMembershipCards() {
    wx.navigateTo({
      url: '/pages/admin-membership-management/admin-membership-management'
    })
  },

  // ==================== 课程预约审核相关 ====================
  onToggleRegistrationType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      registrationViewType: type,
      selectedRegistrations: [],
      allRegistrationsSelected: false,
      isRegistrationSelectionMode: false,
      selectedCourseBookings: [],
      allCourseBookingsSelected: false,
      isCourseBookingSelectionMode: false
    })
  },

  onToggleRegistrationSelectionMode() {
    const entering = !this.data.isRegistrationSelectionMode
    const pendingRegistrations = this.data.pendingRegistrations.map(item => ({
      ...item, selected: false
    }))
    this.setData({
      isRegistrationSelectionMode: entering,
      pendingRegistrations,
      selectedRegistrations: [],
      allRegistrationsSelected: false
    })
  },

  onToggleCourseBookingSelectionMode() {
    const entering = !this.data.isCourseBookingSelectionMode
    const pendingCourseBookings = this.data.pendingCourseBookings.map(item => ({
      ...item, selected: false
    }))
    this.setData({
      isCourseBookingSelectionMode: entering,
      pendingCourseBookings,
      selectedCourseBookings: [],
      allCourseBookingsSelected: false
    })
  },

  onRegistrationCardTap(e) {
    if (this.data.isRegistrationSelectionMode) {
      this.onSelectRegistration(e)
    } else {
      const userId = e.currentTarget.dataset.userId
      const userName = e.currentTarget.dataset.name
      if (userId) {
        wx.navigateTo({
          url: `/pages/user-detail/user-detail?id=${userId}&name=${userName}`
        })
      }
    }
  },

  onCourseBookingCardTap(e) {
    if (this.data.isCourseBookingSelectionMode) {
      this.onSelectCourseBooking(e)
    }
  },

  async loadPendingCourseBookings() {
    try {
      const result = await api.getUserCourseBookings({ status: 'pending', role: 'admin' })
      if (result.success) {
        const data = result.data
        this.setData({
          pendingCourseBookings: (data && data.list) || []
        })
      }
    } catch (error) {
      console.error('加载待审核课程预约失败:', error)
    }
  },

  onSelectCourseBooking(e) {
    const itemId = parseInt(e.currentTarget.dataset.id)
    const pendingCourseBookings = this.data.pendingCourseBookings.map(item => {
      if (item.id === itemId) {
        return { ...item, selected: !item.selected }
      }
      return item
    })
    const selectedCourseBookings = pendingCourseBookings.filter(item => item.selected).map(item => item.id)

    this.setData({
      pendingCourseBookings,
      selectedCourseBookings,
      allCourseBookingsSelected: selectedCourseBookings.length === pendingCourseBookings.length
    })
  },

  onSelectAllCourseBookings() {
    const allSelected = !this.data.allCourseBookingsSelected
    const pendingCourseBookings = this.data.pendingCourseBookings.map(item => ({
      ...item, selected: allSelected
    }))
    const selectedCourseBookings = allSelected ? pendingCourseBookings.map(b => b.id) : []
    this.setData({
      allCourseBookingsSelected: allSelected,
      pendingCourseBookings,
      selectedCourseBookings
    })
  },

  async onBatchApproveCourseBooking() {
    if (this.data.selectedCourseBookings.length === 0) {
      wx.showToast({ title: '请选择要审核的项目', icon: 'none' })
      return
    }

    wx.showModal({
      title: '批量通过',
      content: `确定通过选中的 ${this.data.selectedCourseBookings.length} 个课程预约吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })
          let successCount = 0
          for (const id of this.data.selectedCourseBookings) {
            try {
              const result = await api.approveCourseBooking(id)
              if (result.success) successCount++
            } catch (error) {
              console.error(`审核课程预约ID ${id} 失败:`, error)
            }
          }
          wx.hideLoading()
          wx.showToast({ title: `成功通过 ${successCount} 个`, icon: 'success' })
          this.setData({ selectedCourseBookings: [], allCourseBookingsSelected: false, isCourseBookingSelectionMode: false })
          this.loadPendingCourseBookings()
          this.loadStatistics()
        }
      }
    })
  },

  async onBatchRejectCourseBooking() {
    if (this.data.selectedCourseBookings.length === 0) {
      wx.showToast({ title: '请选择要审核的项目', icon: 'none' })
      return
    }

    wx.showModal({
      title: '批量拒绝',
      content: '请输入拒绝原因',
      editable: true,
      placeholderText: '请输入拒绝原因',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          wx.showLoading({ title: '处理中...' })
          const rejectReason = modalRes.content || '批量审核未通过'
          let successCount = 0
          for (const id of this.data.selectedCourseBookings) {
            try {
              const result = await api.rejectCourseBooking(id, { reject_reason: rejectReason })
              if (result.success) successCount++
            } catch (error) {
              console.error(`拒绝课程预约ID ${id} 失败:`, error)
            }
          }
          wx.hideLoading()
          wx.showToast({ title: `成功拒绝 ${successCount} 个`, icon: 'success' })
          this.setData({ selectedCourseBookings: [], allCourseBookingsSelected: false, isCourseBookingSelectionMode: false })
          this.loadPendingCourseBookings()
          this.loadStatistics()
        }
      }
    })
  },

  // ==================== 课程退款相关 ====================
  onToggleRefundType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      refundViewType: type,
      selectedRefunds: [],
      allRefundsSelected: false,
      isRefundSelectionMode: false,
      selectedCourseRefunds: [],
      allCourseRefundsSelected: false,
      isCourseRefundSelectionMode: false
    })
  },

  async loadCourseRefundBookings() {
    try {
      const result = await api.getUserCourseBookings({ status: 'approved', role: 'admin' })
      if (result.success) {
        const data = result.data
        this.setData({
          courseRefundBookings: (data && data.list) || []
        })
      }
    } catch (error) {
      console.error('加载课程退款列表失败:', error)
    }
  },

  onToggleCourseRefundSelectionMode() {
    const entering = !this.data.isCourseRefundSelectionMode
    const courseRefundBookings = this.data.courseRefundBookings.map(item => ({
      ...item, selected: false
    }))
    this.setData({
      isCourseRefundSelectionMode: entering,
      courseRefundBookings,
      selectedCourseRefunds: [],
      allCourseRefundsSelected: false
    })
  },

  onCourseRefundCardTap(e) {
    if (this.data.isCourseRefundSelectionMode) {
      this.onSelectCourseRefund(e)
    }
  },

  onSelectCourseRefund(e) {
    const itemId = parseInt(e.currentTarget.dataset.id)
    const courseRefundBookings = this.data.courseRefundBookings.map(item => {
      if (item.id === itemId) {
        return { ...item, selected: !item.selected }
      }
      return item
    })
    const selectedCourseRefunds = courseRefundBookings.filter(item => item.selected).map(item => item.id)
    this.setData({
      courseRefundBookings,
      selectedCourseRefunds,
      allCourseRefundsSelected: selectedCourseRefunds.length === courseRefundBookings.length
    })
  },

  onSelectAllCourseRefunds() {
    const allSelected = !this.data.allCourseRefundsSelected
    const courseRefundBookings = this.data.courseRefundBookings.map(item => ({
      ...item, selected: allSelected
    }))
    const selectedCourseRefunds = allSelected ? courseRefundBookings.map(item => item.id) : []
    this.setData({
      courseRefundBookings,
      selectedCourseRefunds,
      allCourseRefundsSelected: allSelected
    })
  },

  async onBatchRefundCourseBooking() {
    if (this.data.selectedCourseRefunds.length === 0) {
      wx.showToast({ title: '请选择要退款的项目', icon: 'none' })
      return
    }

    wx.showModal({
      title: '批量退款',
      content: `确定为选中的 ${this.data.selectedCourseRefunds.length} 个课程预约退款吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })
          let successCount = 0
          for (const id of this.data.selectedCourseRefunds) {
            try {
              const result = await api.rejectCourseBooking(id, { reject_reason: '管理员退款' })
              if (result.success) successCount++
            } catch (error) {
              console.error(`课程退款ID ${id} 失败:`, error)
            }
          }
          wx.hideLoading()
          wx.showToast({ title: `成功退款 ${successCount} 个`, icon: 'success' })
          this.setData({ selectedCourseRefunds: [], allCourseRefundsSelected: false, isCourseRefundSelectionMode: false })
          this.loadCourseRefundBookings()
          this.loadStatistics()
        }
      }
    })
  },

  async onBatchRejectCourseRefund() {
    if (this.data.selectedCourseRefunds.length === 0) {
      wx.showToast({ title: '请选择要拒绝的项目', icon: 'none' })
      return
    }


    wx.showModal({
      title: '批量拒绝退款',
      content: '请输入拒绝原因',
      editable: true,
      placeholderText: '请输入拒绝原因',
      success: async (modalRes) => {
        if (modalRes.confirm) {
          wx.showLoading({ title: '处理中...' })
          const rejectReason = modalRes.content || '管理员拒绝退款'
          let successCount = 0
          for (const id of this.data.selectedCourseRefunds) {
            try {
              const result = await api.adminReviewRefund(id, {
                status: 'rejected',
                admin_notes: rejectReason,
                type: 'course'
              })
              if (result.success) successCount++
            } catch (error) {
              console.error(`课程退款拒绝ID ${id} 失败:`, error)
            }
          }
          wx.hideLoading()
          wx.showToast({ title: `成功拒绝 ${successCount} 个`, icon: 'success' })
          this.setData({ selectedCourseRefunds: [], allCourseRefundsSelected: false, isCourseRefundSelectionMode: false })
          this.loadCourseRefundBookings()
          this.loadStatistics()
        }
      }
    })
  },

  // ==================== 商品退款相关 ====================
  onProductRefundCardTap(e) {
    if (this.data.isProductRefundSelectionMode) {
      const itemId = parseInt(e.currentTarget.dataset.id)
      const productRefundOrders = this.data.productRefundOrders.map(item => {
        if (item.id === itemId) {
          return { ...item, selected: !item.selected }
        }
        return item
      })
      const selectedProductRefunds = productRefundOrders.filter(item => item.selected).map(item => item.id)
      this.setData({
        productRefundOrders,
        selectedProductRefunds,
        allProductRefundsSelected: selectedProductRefunds.length === productRefundOrders.length
      })
    }
  },

  onToggleProductRefundSelectionMode() {
    const entering = !this.data.isProductRefundSelectionMode
    const productRefundOrders = this.data.productRefundOrders.map(item => ({
      ...item, selected: false
    }))
    this.setData({
      isProductRefundSelectionMode: entering,
      productRefundOrders,
      selectedProductRefunds: [],
      allProductRefundsSelected: false
    })
  },

  async onBatchApproveProductRefund() {
    if (this.data.selectedProductRefunds.length === 0) {
      wx.showToast({ title: '请先选择退款项', icon: 'none' })
      return
    }
    wx.showModal({
      title: '批量同意退款',
      content: `确定同意选中的 ${this.data.selectedProductRefunds.length} 个商品退款吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })
          let successCount = 0
          for (const id of this.data.selectedProductRefunds) {
            try {
              const result = await api.adminReviewRefund(id, { status: 'approved', type: 'product' })
              if (result.success) successCount++
            } catch (error) {
              console.error(`商品退款ID ${id} 失败:`, error)
            }
          }
          wx.hideLoading()
          wx.showToast({ title: `成功同意 ${successCount} 个`, icon: 'success' })
          this.setData({ selectedProductRefunds: [], allProductRefundsSelected: false, isProductRefundSelectionMode: false })
          this.loadRefundRequests()
        }
      }
    })
  },

  async onBatchRejectProductRefund() {
    if (this.data.selectedProductRefunds.length === 0) {
      wx.showToast({ title: '请先选择退款项', icon: 'none' })
      return
    }
    wx.showModal({
      title: '批量拒绝退款',
      content: `确定拒绝选中的 ${this.data.selectedProductRefunds.length} 个商品退款吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' })
          let successCount = 0
          for (const id of this.data.selectedProductRefunds) {
            try {
              const result = await api.adminReviewRefund(id, { status: 'rejected', type: 'product' })
              if (result.success) successCount++
            } catch (error) {
              console.error(`商品退款拒绝ID ${id} 失败:`, error)
            }
          }
          wx.hideLoading()
          wx.showToast({ title: `成功拒绝 ${successCount} 个`, icon: 'success' })
          this.setData({ selectedProductRefunds: [], allProductRefundsSelected: false, isProductRefundSelectionMode: false })
          this.loadRefundRequests()
        }
      }
    })
  },

  // ==================== 课程管理相关 ====================
  async loadCourses() {
    try {
      const result = await api.getTeacherCourses({ show_all: 1 })
      if (result.success) {
        this.setData({
          courses: result.data || [],
          allCourses: result.data || []
        })
      }
    } catch (error) {
      console.error('加载课程列表失败:', error)
    }
  },



  onCourseSearchInput(e) {
    this.setData({
      courseSearchValue: e.detail.value
    })
  },

  onCourseSearch() {
    const searchValue = this.data.courseSearchValue.toLowerCase()

    if (!searchValue) {
      this.setData({
        courses: this.data.allCourses
      })
      return
    }

    const filtered = this.data.allCourses.filter(course =>
      course.title && course.title.toLowerCase().includes(searchValue)
    )

    this.setData({
      courses: filtered
    })
  },

  onCreateCourse() {
    wx.navigateTo({
      url: '/pages/teacher-course-edit/teacher-course-edit'
    })
  },

  onEditCourse(e) {
    const courseId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/teacher-course-edit/teacher-course-edit?id=${courseId}`
    })
  },

  onViewCourseParticipants(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/course-participants/course-participants?id=${id}`
    })
  },

  onDeleteCourse(e) {
    const courseId = e.currentTarget.dataset.id
    const courseName = e.currentTarget.dataset.name

    wx.showModal({
      title: '⚠️ 危险操作',
      content: `确认删除课程「${courseName}」？\n\n此操作将同时删除：\n• 所有预约记录\n• 课程时间表\n\n删除后无法恢复！`,
      confirmText: '确认删除',
      cancelText: '取消',
      confirmColor: '#f44336',
      success: async (res) => {
        if (!res.confirm) return

        wx.showModal({
          title: '最终确认',
          content: '您确定要永久删除此课程吗？',
          confirmText: '永久删除',
          cancelText: '取消',
          confirmColor: '#f44336',
          success: async (res2) => {
            if (!res2.confirm) return

            try {
              wx.showLoading({ title: '删除中...' })
              const result = await api.deleteTeacherCourse(courseId)
              wx.hideLoading()

              if (result.success) {
                wx.showToast({ title: '删除成功', icon: 'success' })
                this.loadCourses()
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


  // ==================== 会员卡管理相关 ====================
  async loadMembershipCards() {
    try {
      const result = await api.getMembershipCards()
      if (result.success) {
        this.setData({
          membershipCards: result.data || []
        })
      }
    } catch (error) {
      console.error('加载会员卡失败:', error)
    }
  },

  onCreateMembershipCard() {
    wx.navigateTo({
      url: '/pages/admin-membership-edit/admin-membership-edit'
    })
  },

  onEditMembershipCard(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/admin-membership-edit/admin-membership-edit?id=${id}`
    })
  },

  onDeleteMembershipCard(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name

    wx.showModal({
      title: '删除会员卡',
      content: `确定要删除"${name}"吗？`,
      confirmColor: '#ff5722',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            const result = await api.deleteMembershipCard(id)
            wx.hideLoading()

            if (result.success) {
              wx.showToast({ title: '删除成功', icon: 'success' })
              this.loadMembershipCards()
            } else {
              wx.showToast({ title: result.message || '删除失败', icon: 'none' })
            }
          } catch (error) {
            wx.hideLoading()
            wx.showToast({ title: '网络错误', icon: 'none' })
          }
        }
      }
    })
  },

  async onGiftMembershipCard(e) {
    const cardId = e.currentTarget.dataset.id
    try {
      wx.showLoading({ title: '加载用户...' })
      const result = await api.adminGetUsers({ page_size: 999 })
      wx.hideLoading()
      if (result.success) {
        const users = (result.data.users || result.data || []).map(u => ({ ...u, selected: false }))
        this.setData({
          showGiftModal: true,
          giftCardId: cardId,
          giftUserList: users,
          giftUserListAll: users,
          allGiftUsersSelected: false
        })
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '加载用户失败', icon: 'none' })
    }
  },

  noop() {},

  onCloseGiftModal() {
    this.setData({ showGiftModal: false, giftCardId: null, giftUserList: [], giftUserListAll: [] })
  },

  onGiftUserSearch(e) {
    const keyword = e.detail.value.trim().toLowerCase()
    if (!keyword) {
      this.setData({ giftUserList: this.data.giftUserListAll })
      return
    }
    const filtered = this.data.giftUserListAll.filter(u =>
      (u.real_name || '').toLowerCase().includes(keyword) ||
      (u.phone || '').includes(keyword)
    )
    this.setData({ giftUserList: filtered })
  },

  onGiftUserTap(e) {
    const index = e.currentTarget.dataset.index
    const key = `giftUserList[${index}].selected`
    const newVal = !this.data.giftUserList[index].selected
    this.setData({ [key]: newVal })
    // 同步到 giftUserListAll
    const userId = this.data.giftUserList[index].id
    const allList = this.data.giftUserListAll
    const allIndex = allList.findIndex(u => u.id === userId)
    if (allIndex >= 0) {
      this.setData({ [`giftUserListAll[${allIndex}].selected`]: newVal })
    }
    // 更新全选状态
    const allSelected = this.data.giftUserListAll.every(u => u.selected)
    this.setData({ allGiftUsersSelected: allSelected })
  },

  onSelectAllGiftUsers() {
    const newVal = !this.data.allGiftUsersSelected
    const allList = this.data.giftUserListAll.map(u => ({ ...u, selected: newVal }))
    const displayList = this.data.giftUserList.map(u => ({ ...u, selected: newVal }))
    this.setData({
      giftUserListAll: allList,
      giftUserList: displayList,
      allGiftUsersSelected: newVal
    })
  },

  async onConfirmGift() {
    const selectedUsers = this.data.giftUserListAll.filter(u => u.selected)
    if (selectedUsers.length === 0) {
      wx.showToast({ title: '请选择用户', icon: 'none' })
      return
    }
    wx.showModal({
      title: '确认赠送',
      content: `确定要赠送给${selectedUsers.length}位用户吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '赠送中...' })
            const result = await api.adminGiftMembershipCard(this.data.giftCardId, {
              user_ids: selectedUsers.map(u => u.id)
            })
            wx.hideLoading()
            if (result.success) {
              wx.showToast({ title: result.message || '赠送成功', icon: 'success' })
              this.onCloseGiftModal()
            } else {
              wx.showToast({ title: result.message || '赠送失败', icon: 'none' })
            }
          } catch (error) {
            wx.hideLoading()
            wx.showToast({ title: '网络错误', icon: 'none' })
          }
        }
      }
    })
  },

  // ==================== 首页管理相关 ====================
  onManageVenueContent() {
    wx.navigateTo({
      url: '/pages/admin-venue-content/admin-venue-content'
    })
  },

  async loadCarouselActivities() {
    try {
      const result = await api.getCarouselActivities()
      if (result.success) {
        this.setData({ carouselActivities: result.data || [] })
      }
    } catch (error) {
      console.error('加载轮播活动失败:', error)
    }
  },

  // ==================== 商品分类管理 ====================
  onManageProductCategories() {
    wx.navigateTo({
      url: '/pages/admin-product-categories/admin-product-categories'
    })
  },
  
    // 扫码核销
    onScanConsume() {
      wx.scanCode({
        onlyFromCamera: false,
        scanType: ['qrCode'],
        success: (res) => {
          const qrContent = res.result
          wx.navigateTo({
            url: `/pages/scan-consume/scan-consume?qr=${encodeURIComponent(qrContent)}`
          })
        },
        fail: () => {
          wx.showToast({ title: '扫码取消', icon: 'none' })
        }
      })
    },
  
})
