var envConfig = require('../config/env')
var BASE_URL = envConfig.apiUrl

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    }
    
    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    
    if (openid) {
      header['OpenId'] = openid
    } else if (userId) {
      header['User-Id'] = userId
    }
    
    wx.request({
      url: `${BASE_URL}${url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: header,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(res.data)
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

// 通用压缩并上传工具函数
function compressAndUpload(filePath, uploadUrl, fileName, extraHeader) {
  return new Promise((resolve, reject) => {
    const header = Object.assign({}, extraHeader)
    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    if (openid) {
      header['OpenId'] = openid
    } else if (userId) {
      header['User-Id'] = userId
    }

    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 10000)
    const fullUrl = `${uploadUrl}?t=${timestamp}&r=${random}`

    function doUpload(path) {
      wx.uploadFile({
        url: fullUrl,
        filePath: path,
        name: fileName,
        header: header,
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            resolve(data)
          } catch (e) {
            reject(e)
          }
        },
        fail: (err) => {
          reject(err)
        }
      })
    }

    wx.compressImage({
      src: filePath,
      quality: 60,
      success: (compressRes) => {
        doUpload(compressRes.tempFilePath)
      },
      fail: () => {
        // 压缩失败直接用原图
        doUpload(filePath)
      }
    })
  })
}

const api = {
  // 认证相关
  wechatLogin: (code, userInfo) => request('/auth/wechat-login', { method: 'POST', data: { code, userInfo } }),
  passwordLogin: (username, password) => request('/auth/password-login', { method: 'POST', data: { username, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  checkAdmin: () => request('/auth/admin-check'),

  // 活动相关
  getActivities: (params = {}) => request('/activities', { data: params }),
  getActivityDetail: (id) => request(`/activities/${id}`),
  registerActivity: (id, data) => request(`/activities/${id}/register`, { method: 'POST', data }),
  getActivityPhotos: (id) => request(`/activities/${id}/photos`),
  getCarouselActivities: () => request('/activities/carousel'),

  // 用户相关
  getUserProfile: () => request('/users/profile'),
  getUserTrainingStats: () => request('/users/training-stats'),
  updateUserProfile: (data) => request('/users/profile', { method: 'PUT', data }),
  getUserActivities: () => request('/users/activities'),
  cancelActivity: (id, data) => request(`/users/activities/${id}/cancel`, { method: 'POST', data }),
  getInsuranceStatus: () => request('/users/insurance-status'),

  // 收货地址相关
  getAddresses: () => request('/addresses'),
  createAddress: (data) => request('/addresses', { method: 'POST', data }),
  updateAddress: (id, data) => request(`/addresses/${id}`, { method: 'PUT', data }),
  deleteAddress: (id) => request(`/addresses/${id}`, { method: 'DELETE' }),

  // 保险凭证相关
  submitInsurance: (data) => request('/insurance-submissions', { method: 'POST', data }),
  getInsuranceSubmissions: () => request('/insurance-submissions'),

  // 商品相关
  getProducts: (params = {}) => request('/products', { data: params }),
  getProductDetail: (id) => request(`/products/${id}`),

  // 购物车相关
  getCart: () => request('/cart'),
  addToCart: (data) => request('/cart', { method: 'POST', data }),
  updateCartItem: (id, data) => request(`/cart/${id}`, { method: 'PUT', data }),
  deleteCartItem: (id) => request(`/cart/${id}`, { method: 'DELETE' }),
  createOrder: (data) => request('/orders', { method: 'POST', data }),
  getUserOrders: (params = {}) => request('/orders', { data: params }),

  // 管理员活动相关
  adminGetActivities: (params = {}) => request('/admin/activities', { data: params }),
  adminCreateActivity: (data) => request('/admin/activities', { method: 'POST', data }),
  adminUpdateActivity: (id, data) => request(`/admin/activities/${id}`, { method: 'PUT', data }),
  adminDeleteActivity: (id) => request(`/admin/activities/${id}`, { method: 'DELETE' }),
  adminGetStatistics: () => request('/admin/statistics'),
  adminGetRegistrations: (params = {}) => request('/admin/registrations', { data: params }),
  adminReviewRegistration: (id, data) => request(`/admin/registrations/${id}/review`, { method: 'PUT', data }),
  adminReorderActivities: (data) => request('/admin/activities/reorder', { method: 'PUT', data }),
  adminSaveActivityAsNew: (id, data) => request(`/admin/activities/${id}/save-as-new`, { method: 'POST', data }),

  // 管理员用户相关
  adminGetUsers: (params = {}) => request('/admin/users', { data: params }),
  adminGetUserDetail: (id) => request(`/admin/users/${id}`),
  adminUpdateUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PUT', data: { role } }),
  adminUpdateUserType: (id, userType) => request(`/users/${id}/set-type`, { method: 'PUT', data: { user_type: userType } }),
  adminGetUserHistory: (id) => request(`/users/${id}/history`),

  // 管理员商品相关
  adminGetProducts: (params = {}) => request('/admin/products', { data: params }),
  adminCreateProduct: (data) => request('/admin/products', { method: 'POST', data }),
  adminUpdateProduct: (id, data) => request(`/admin/products/${id}`, { method: 'PUT', data }),
  adminDeleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),

  // 管理员保险审核
  adminGetInsuranceSubmissions: (params = {}) => request('/admin/insurance-submissions', { data: params }),
  adminReviewInsurance: (id, data) => request(`/admin/insurance-submissions/${id}/review`, { method: 'PUT', data }),

  // 退款相关
  requestRefund: (id, data) => request(`/users/activities/${id}/refund`, { method: 'POST', data }),
  requestCourseRefund: (id, data) => request(`/course-booking/${id}/refund`, { method: 'POST', data }),
  requestOrderRefund: (id, data) => request(`/order/${id}/refund`, { method: 'POST', data }),
  adminGetRefunds: (params = {}) => request('/admin/refunds', { data: params }),
  adminReviewRefund: (id, data) => request(`/admin/refunds/${id}/review`, { method: 'PUT', data }),

  // 订单相关
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),

  // 导出功能
  exportInsurance: (activityId) => request(`/admin/activities/${activityId}/export-insurance`),
  exportNoInsurance: (activityId) => request(`/admin/activities/${activityId}/export-no-insurance`),

  // 支付相关
  createPaymentOrder: (data) => request('/payment/create-order', { method: 'POST', data }),

  // 活动照片上传（加入压缩）
  uploadActivityPhoto: (activityId, filePath) => {
    return compressAndUpload(
      filePath,
      `${BASE_URL}/activities/${activityId}/photos`,
      'photo',
      {}
    )
  },

  // 删除活动照片（管理员）
  deleteActivityPhoto: (photoId) => request(`/admin/photos/${photoId}`, { method: 'DELETE' }),

  // 通知相关
  getUserNotifications: (params = {}) => request('/notifications', { data: params }),
  markNotificationAsRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),

  // 文件上传（加入压缩，移除旧的临时文件清理逻辑避免包体积问题）
  uploadImage: (filePath) => {
    return compressAndUpload(
      filePath,
      `${BASE_URL}/upload/image`,
      'image',
      {}
    )
  },

  // 管理员日志相关
  adminGetOperationLogs: (params = {}) => request('/admin/logs/operations', { data: params }),
  adminGetErrorLogs: (params = {}) => request('/admin/logs/errors', { data: params }),
  adminManualBackup: () => request('/admin/backup/manual', { method: 'POST' }),

  // 教练课程相关
  getTeacherCourses: (params = {}) => request('/teacher-courses', { data: params }),
  getTeacherCourseDetail: (id) => request(`/teacher-courses/${id}`),
  createTeacherCourse: (data) => request('/teacher-courses', { method: 'POST', data }),
  updateTeacherCourse: (id, data) => request(`/teacher-courses/${id}`, { method: 'PUT', data }),
  deleteTeacherCourse: (id) => request(`/teacher-courses/${id}`, { method: 'DELETE' }),

  // 会员卡相关
  getMembershipCards: (params = {}) => request('/membership-cards', { data: params }),
  getMembershipCardDetail: (id) => request(`/membership-cards/${id}`),
  createMembershipCard: (data) => request('/membership-cards', { method: 'POST', data }),
  deleteMembershipCard: (id) => request(`/membership-cards/${id}`, { method: 'DELETE' }),

  // 教练相关
  getTeachers: (params = {}) => request('/teachers', { data: params }),
  getTeacherDetail: (id) => request(`/teachers/${id}`),

  // 课程预约相关
  createCourseBooking: (data) => request('/course-bookings', { method: 'POST', data }),
  getUserCourseBookings: (params = {}) => request('/course-bookings', { data: params }),
  approveCourseBooking: (id) => request(`/course-bookings/${id}/approve`, { method: 'PUT' }),
  rejectCourseBooking: (id, data) => request(`/course-bookings/${id}/reject`, { method: 'PUT', data }),

  // 配送订单相关
  getDeliveryOrders: (params = {}) => request('/delivery-orders', { data: params }),
  confirmDeliveryOrder: (id) => request(`/delivery-orders/${id}/confirm`, { method: 'PUT' }),

  // 筛选分类相关
  getFilterCategories: (params = {}) => request('/filter-categories', { data: params }),
  createFilterCategory: (data) => request('/filter-categories', { method: 'POST', data }),
  updateFilterCategory: (id, data) => request(`/filter-categories/${id}`, { method: 'PUT', data }),
  deleteFilterCategory: (id) => request(`/filter-categories/${id}`, { method: 'DELETE' }),

  // 场馆内容相关
  getVenueContent: (params = {}) => request('/venue-content', { data: params }),
  createVenueContent: (data) => request('/venue-content', { method: 'POST', data }),
  updateVenueContent: (id, data) => request(`/venue-content/${id}`, { method: 'PUT', data }),
  deleteVenueContent: (id) => request(`/venue-content/${id}`, { method: 'DELETE' }),

  // 用户会员卡相关
  getUserMembershipCards: (params = {}) => request('/user-membership-cards', { data: params }),
  checkUserMembershipCard: () => request('/user-membership-cards/check'),
  purchaseMembershipCard: (id, data) => request(`/membership-cards/${id}/purchase`, { method: 'POST', data }),
  activateUserMembershipCard: (id) => request(`/user-membership-cards/${id}/activate`, { method: 'PUT' }),

  // 管理员赠送会员卡
  adminGiftMembershipCard: (cardId, data) => request(`/admin/membership-cards/${cardId}/gift`, { method: 'POST', data }),

  // 课程参与者
  getCourseParticipants: (courseId) => request(`/teacher-courses/${courseId}/participants`),

  // 积分相关
  getUserPoints: () => request('/user-points/current'),
  getUserPointsHistory: (params = {}) => request('/user-points', { data: params }),

  // 站点设置相关
  getConsultInfo: () => request('/site-settings/consult-info'),
  updateConsultInfo: (data) => request('/site-settings/consult-info', { method: 'PUT', data }),

    // 二维码核销相关
    getQrcodeData: () => request('/user/qrcode-data'),
    verifyQrcode: (data) => request('/membership-cards/verify-qrcode', { method: 'POST', data }),
    consumeMembershipCard: (id) => request(`/user-membership-cards/${id}/consume`, { method: 'POST' }),
    getConsumeLogs: (id) => request(`/user-membership-cards/${id}/consume-logs`),
  
}

module.exports = api
