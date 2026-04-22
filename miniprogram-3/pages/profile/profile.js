const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    userProfile: {},
    userActivities: {},
    orders: [],
    isAdmin: false,
    isTeacher: false,
    hasNoActivities: true,
    activityCount: 0,
    isLogin: false,
    showLoginForm: false,
    loginData: {
      username: '',
      password: ''
    },
    defaultAddress: null,
    insuranceSubmissionStatus: null,
    unreadNotificationCount: 0,
    myCardsCount: 0,
    myBookingsCount: 0,
    showEditConsultModal: false,
    editConsultText: '',
    trainingStats: {
      cumulative_days: 0,
      cumulative_training_count: 0,
      monthly_training_count: 0,
      monthly_training_days: 0,
      monthly_training_minutes: 0
    },
    maskedPhone: '',
    consultInfo: '',
    showAgreementPopup: false,  // 新增：控制协议弹窗显示
    isAgreed: false             // 新增：用户是否勾选同意
  },

  onLoad() {
    console.log('===== Profile页面加载 =====')
    this.checkLoginStatus()
  },

  onShow() {
    console.log('===== Profile页面显示 =====')
    this.checkLoginStatus()
  },

  async checkLoginStatus() {
    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    const isLogin = wx.getStorageSync('isLogin')


    this.setData({
      isLogin: !!isLogin && (!!openid || !!userId)
    })


    if (this.data.isLogin) {
      await this.loadUserData()
      await this.checkAdminStatus()
      this.checkTeacherStatus()
      this.loadConsultInfo()
      this.checkNeedFillProfile()
    }
  },



  doWxLogin() {
    wx.showLoading({ title: '微信登录中...' })
  
    wx.login({
      success: async (res) => {
        if (res.code) {
          try {
            const result = await api.wechatLogin(res.code, {})
  
            if (result.success) {
              wx.setStorageSync('isLogin', true)
              wx.setStorageSync('openid', result.data.openid)
              wx.setStorageSync('userId', result.data.user.id)
              wx.setStorageSync('userRole', result.data.user.role)
  
              this.setData({
                isLogin: true,
                showLoginForm: false
              })
  
              wx.hideLoading()
              wx.showToast({ title: '微信登录成功', icon: 'success' })
  
              await this.loadUserData()
              this.checkAdminStatus()
              this.checkTeacherStatus()
              this.checkNeedFillProfile()
            } else {
              wx.hideLoading()
              wx.showToast({ title: result.message || '微信登录失败', icon: 'none' })
            }
          } catch (error) {
            console.error('微信登录失败:', error)
            wx.hideLoading()
            wx.showToast({ title: '微信登录失败', icon: 'none' })
          }
        } else {
          wx.hideLoading()
          wx.showToast({ title: '获取登录凭证失败', icon: 'none' })
        }
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '微信登录失败', icon: 'none' })
      }
    })
  },

  // ★ 新增：微信登录按钮点击时先弹出协议弹窗
  onWechatLogin() {
    // ★ 每次登录都弹出协议弹窗
    this.setData({ showAgreementPopup: true, isAgreed: false })
  },


 
  onToggleLogin() {
    this.setData({
      showLoginForm: !this.data.showLoginForm
    })
  },

  onLoginInput(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`loginData.${field}`]: value
    })
  },

  async onPasswordLogin() {
    const { username, password } = this.data.loginData

    if (!username || !password) {
      wx.showToast({
        title: '请输入用户名和密码',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '登录中...' })

    try {
      const result = await api.passwordLogin(username, password)

      console.log('登录结果:', result)

      if (result.success) {
        wx.setStorageSync('isLogin', true)
        wx.setStorageSync('userId', result.data.user.id)
        wx.setStorageSync('userRole', result.data.user.role)

        this.setData({
          isLogin: true,
          showLoginForm: false,
          loginData: { username: '', password: '' }
        })

        wx.showToast({
          title: result.data.message,
          icon: 'success'
        })

        await this.loadUserData()
        this.checkAdminStatus()
        this.checkTeacherStatus()
      } else {
        wx.showToast({
          title: result.message || '登录失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('登录失败:', error)
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      })
    }

    wx.hideLoading()
  },

  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.logout()

            wx.removeStorageSync('isLogin')
            wx.removeStorageSync('userId')
            wx.removeStorageSync('userRole')
            wx.removeStorageSync('openid')

            this.setData({
              isLogin: false,
              userProfile: {},
              userActivities: {},
              orders: [],
              isAdmin: false,
              isTeacher: false,
              showLoginForm: false,
              loginData: { username: '', password: '' },
              activityCount: 0,
              unreadNotificationCount: 0,
              myCardsCount: 0,
              myBookingsCount: 0
            })

            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            })
          } catch (error) {
            wx.showToast({
              title: '退出失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  async loadUserData() {
    if (!this.data.isLogin) {
      console.log('未登录，跳过加载数据')
      return
    }

    console.log('===== 开始加载用户数据 =====')

    try {
      wx.showLoading({ title: '加载中...' })

      console.log('1. 获取用户资料...')
      const profileResult = await api.getUserProfile()
      console.log('用户资料结果:', profileResult)

      if (profileResult.success) {
        console.log('用户资料加载成功:', profileResult.data)
        this.setData({
          userProfile: profileResult.data
        })
      } else {
        console.error('用户资料加载失败:', profileResult.message)
      }

      console.log('2. 获取活动记录...')
      const activitiesResult = await api.getUserActivities()
      console.log('活动记录结果:', activitiesResult)

      if (activitiesResult.success) {
        const activities = activitiesResult.data
        const activityCount = (activities.pending?.length || 0) +
                             (activities.approved?.length || 0) +
                             (activities.completed?.length || 0) +
                             (activities.cancelled?.length || 0) +
                             (activities.rejected?.length || 0)

        console.log('活动总数:', activityCount)

        this.setData({
          userActivities: activities,
          hasNoActivities: activityCount === 0,
          activityCount
        })
      } else {
        console.error('活动记录加载失败:', activitiesResult.message)
        this.setData({
          hasNoActivities: true,
          activityCount: 0
        })
      }

      console.log('3. 获取订单...')
      const ordersResult = await api.getUserOrders()
      console.log('订单结果:', ordersResult)

      if (ordersResult.success) {
        this.setData({
          orders: ordersResult.data || []
        })
      }

      console.log('4. 获取地址...')
      const addressResult = await api.getAddresses()
      console.log('地址结果:', addressResult)

      if (addressResult.success) {
        const addresses = addressResult.data || []
        const defaultAddr = addresses.find(a => a.is_default) || addresses[0]
        console.log('默认地址:', defaultAddr)
        this.setData({
          defaultAddress: defaultAddr || null
        })
      }

      console.log('5. 获取保险提交记录...')
      const insuranceResult = await api.getInsuranceSubmissions()
      console.log('保险记录结果:', insuranceResult)

      if (insuranceResult.success) {
        const submissions = insuranceResult.data || []
        const pending = submissions.find(s => s.status === 'pending')
        this.setData({
          insuranceSubmissionStatus: pending ? 'pending' : null
        })
      }

      console.log('6. 获取未读通知...')
      const notificationResult = await api.getUserNotifications({ page: 1, limit: 100 })
      if (notificationResult.success) {
        const unreadCount = (notificationResult.data || []).filter(n => n.is_read === 0).length
        this.setData({
          unreadNotificationCount: unreadCount
        })
        console.log('未读通知数:', unreadCount)
      }

      console.log('7. 获取会员卡数量...')
      this.loadMyCardsCount()

      console.log('8. 获取课程预约数量...')
      this.loadMyBookingsCount()

      console.log('9. 获取训练统计...')
      const statsResult = await api.getUserTrainingStats()
      if (statsResult.success) {
        this.setData({
          trainingStats: statsResult.data
        })
        console.log('训练统计:', statsResult.data)
      }

      // 计算遮蔽手机号
      const phone = this.data.userProfile.phone || ''
      if (phone.length >= 7) {
        this.setData({
          maskedPhone: phone.substring(0, 3) + '****' + phone.substring(phone.length - 4)
        })
      } else {
        this.setData({
          maskedPhone: phone || '未设置'
        })
      }

      wx.hideLoading()
      console.log('===== 用户数据加载完成 =====')
      console.log('当前用户资料:', this.data.userProfile)

    } catch (error) {
      wx.hideLoading()
      console.error('===== 加载用户数据异常 =====')
      console.error('异常信息:', error)

      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      })

      this.setData({
        hasNoActivities: true,
        activityCount: 0
      })
    }
  },

  // 加载会员卡数量
  async loadMyCardsCount() {
    try {
      const openid = wx.getStorageSync('openid')
      const userId = wx.getStorageSync('userId')
      const header = { 'Content-Type': 'application/json' }
      if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }
      wx.request({
        url: `${app.globalData.apiUrl}/api/user-membership-cards`,
        method: 'GET',
        header: header,
        success: (res) => {
          if (res.data.code === 200) {
            const cards = res.data.data || []
            this.setData({
              myCardsCount: cards.length
            })
          }
        }
      })
    } catch (error) {
      console.error('加载会员卡数量失败:', error)
    }
  },

  // 加载课程预约数量
  async loadMyBookingsCount() {
    try {
      const openid = wx.getStorageSync('openid')
      const userId = wx.getStorageSync('userId')
      const header = { 'Content-Type': 'application/json' }
      if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }
      wx.request({
        url: `${app.globalData.apiUrl}/api/course-bookings`,
        method: 'GET',
        header: header,
        success: (res) => {
          if (res.data.code === 200) {
            const data = res.data.data
            // API 返回分页对象 {list, total, page, limit}，不是数组
            const count = (data && data.total) ? data.total : ((data && data.list) ? data.list.length : 0)
            this.setData({
              myBookingsCount: count
            })
          }
        }
      })
    } catch (error) {
      console.error('加载课程预约数量失败:', error)
    }
  },

  // 检查是否需要填写个人信息
  checkNeedFillProfile() {
    const profile = this.data.userProfile
    if (!profile) return


    const realName = profile.real_name || ''
    const phone = profile.phone || ''


    // 新用户（真实姓名为空或为"微信用户"）或手机号为自动生成的临时号
    const needFill = !realName || realName === '微信用户' || phone.startsWith('t')


    if (needFill) {
      wx.showModal({
        title: '完善个人信息',
        content: '请先完善您的个人信息（姓名、手机号等），以便正常使用各项功能。',
        confirmText: '去填写',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/personal-info/personal-info'
            })
          }
        }
      })
    }
  },

  async checkAdminStatus() {
    // 管理员状态统一由 checkTeacherStatus 根据 user_type 判断
    // 这里只做后端权限验证（用于需要管理员API的场景）
    if (!this.data.isLogin) return
    // 不再单独设置 isAdmin，由 checkTeacherStatus 统一处理
  },


  checkTeacherStatus() {
    if (!this.data.isLogin) return

    const userType = this.data.userProfile.user_type
    console.log('用户类型:', userType)
    
    // 教练：只显示教练后台
    // 管理员：只显示管理员后台
    // 两者不会同时显示
    this.setData({
      isTeacher: userType === 'teacher',
      isAdmin: userType === 'admin'
    })
  },



  onGoPersonalInfo() {
    wx.navigateTo({
      url: '/pages/personal-info/personal-info'
    })
  },

  onAvatarChange() {
    wx.getUserProfile({
      desc: '用于更新用户头像',
      success: async (res) => {
        const avatarUrl = res.userInfo.avatarUrl

        console.log('获取到微信头像:', avatarUrl)

        this.setData({
          'userProfile.avatar_url': avatarUrl
        })

        wx.showToast({
          title: '头像更新成功',
          icon: 'success'
        })
      },
      fail: () => {
        wx.showToast({
          title: '需要授权才能使用',
          icon: 'none'
        })
      }
    })
  },

  onViewActivities() {
    wx.navigateTo({
      url: '/pages/my-activities/my-activities'
    })
  },

  onViewOrders() {
    wx.navigateTo({
      url: '/pages/my-orders/my-orders'
    })
  },

  onViewNotifications() {
    wx.navigateTo({
      url: '/pages/notifications/notifications'
    })
  },

  onViewMyCards() {
    wx.navigateTo({
      url: '/pages/my-membership-cards/my-membership-cards'
    })
  },

  onViewMyBookings() {
    wx.navigateTo({
      url: '/pages/my-course-bookings/my-course-bookings'
    })
  },

  onTeacherBackend() {
    if (this.data.isTeacher) {
      wx.navigateTo({
        url: '/pages/teacher-backend/teacher-backend'
      })
    } else {
      wx.showToast({
        title: '无教练权限',
        icon: 'none'
      })
    }
  },

  onAdminClick() {
    if (this.data.isAdmin) {
      wx.navigateTo({
        url: '/pages/admin/admin'
      })
    } else {
      wx.showToast({
        title: '无管理员权限',
        icon: 'none'
      })
    }
  },

  onUploadInsurance() {
    wx.navigateTo({
      url: '/pages/insurance-submit/insurance-submit'
    })
  },

  onManageAddress() {
    wx.navigateTo({
      url: '/pages/address-manage/address-manage'
    })
  },

  onShowMyQrcode() {
    wx.navigateTo({
      url: '/pages/my-qrcode/my-qrcode'
    })
  },

  // 加载咨询信息
  async loadConsultInfo() {
    try {
      const result = await api.getConsultInfo()
      if (result.success) {
        this.setData({
          consultInfo: result.data.consult_info || ''
        })
      }
    } catch (error) {
      console.error('获取咨询信息失败:', error)
    }
  },

  noop() {},

  // 编辑咨询信息（管理员）
  onEditConsultInfo() {
    if (!this.data.isAdmin) return
    this.setData({
      showEditConsultModal: true,
      editConsultText: this.data.consultInfo || ''
    })
  },

  onCloseEditConsultModal() {
    this.setData({ showEditConsultModal: false })
  },

  onConsultInput(e) {
    this.setData({ editConsultText: e.detail.value })
  },

  async onSaveConsultInfo() {
    try {
      wx.showLoading({ title: '保存中...' })
      const result = await api.updateConsultInfo({ consult_info: this.data.editConsultText })
      wx.hideLoading()
      if (result.success) {
        this.setData({
          consultInfo: this.data.editConsultText,
          showEditConsultModal: false
        })
        wx.showToast({ title: '修改成功', icon: 'success' })
      } else {
        wx.showToast({ title: result.message || '修改失败', icon: 'none' })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('更新咨询信息失败:', error)
      wx.showToast({ title: '修改失败', icon: 'none' })
    }
  },
  onPullDownRefresh() {
    this.checkLoginStatus()
    wx.stopPullDownRefresh()
  },

  // ★★★ 以下全部为新增方法 ★★★


  // ★ 新增：跳转到用户服务协议
  goToAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    })
  },


  // ★ 新增：跳转到隐私政策
  goToPrivacy() {
    wx.navigateTo({
      url: '/pages/privacy-policy/privacy-policy'
    })
  },


  // ★ 新增：切换勾选状态
  toggleAgreement() {
    this.setData({
      isAgreed: !this.data.isAgreed
    })
  },


  // ★ 新增：取消登录（关闭弹窗）
  cancelAgreement() {
    this.setData({
      showAgreementPopup: false,
      isAgreed: false
    })
  },


  // ★ 新增：同意协议并登录
  confirmAgreement() {
    if (!this.data.isAgreed) {
      wx.showToast({
        title: '请先勾选同意协议',
        icon: 'none'
      })
      return
    }
    this.setData({
      showAgreementPopup: false
    })
    // 记住用户已同意，下次不再弹窗
    wx.setStorageSync('hasAgreedProtocol', true)
    // 调用真正的微信登录
    this.doWxLogin()
  }
})

