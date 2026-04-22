const api = require('../../utils/api')

Page({
  data: {
    registrationViewType: 'activity',
    pendingRegistrations: [],
    selectedRegistrations: [],
    allRegistrationsSelected: false,
    isRegistrationSelectionMode: false,
    pendingCourseBookings: [],
    selectedCourseBookings: [],
    allCourseBookingsSelected: false,
    isCourseBookingSelectionMode: false
  },

  onLoad() {
    this.loadPendingRegistrations()
    this.loadPendingCourseBookings()
  },

  onShow() {
    this.loadPendingRegistrations()
    this.loadPendingCourseBookings()
  },

  // ==================== 数据加载 ====================
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

  async loadPendingCourseBookings() {
    try {
      const result = await api.getUserCourseBookings({ status: 'pending', role: 'teacher' })
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

  // ==================== 视图切换 ====================
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

  // ==================== 活动报名选择模式 ====================
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

  // ==================== 课程预约选择模式 ====================
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

  onCourseBookingCardTap(e) {
    if (this.data.isCourseBookingSelectionMode) {
      this.onSelectCourseBooking(e)
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

  // ==================== 活动报名批量操作 ====================
  async onBatchApprove() {
    if (this.data.selectedRegistrations.length === 0) {
      wx.showToast({ title: '请选择要审核的项目', icon: 'none' })
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
          wx.showToast({ title: `成功审核 ${successCount} 个`, icon: 'success' })

          this.setData({
            selectedRegistrations: [],
            allRegistrationsSelected: false,
            isRegistrationSelectionMode: false
          })

          this.loadPendingRegistrations()
        }
      }
    })
  },

  async onBatchReject() {
    if (this.data.selectedRegistrations.length === 0) {
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
          wx.showToast({ title: `成功拒绝 ${successCount} 个`, icon: 'success' })

          this.setData({
            selectedRegistrations: [],
            allRegistrationsSelected: false,
            isRegistrationSelectionMode: false
          })

          this.loadPendingRegistrations()
        }
      }
    })
  },

  // ==================== 课程预约批量操作 ====================
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
        }
      }
    })
  }
})
