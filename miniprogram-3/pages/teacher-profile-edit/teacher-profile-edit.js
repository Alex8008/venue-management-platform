const app = getApp()

Page({
  data: {
    teacherInfo: {}
  },

  onLoad() {
    this.loadTeacherInfo()
  },

  // 加载教练信息
  loadTeacherInfo() {
    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')

    wx.showLoading({ title: '加载中...' })
    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }
    wx.request({
      url: `${app.globalData.apiUrl}/api/users/profile`,
      method: 'GET',
      header: header,
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          this.setData({
            teacherInfo: res.data.data
          })
        } else {
          wx.showToast({
            title: res.data.message || '加载失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('加载教练信息失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  // 输入框变化
  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({
      [`teacherInfo.${field}`]: value
    })
  },

  // 选择头像
  onChooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        this.uploadImage(tempFilePath, 'avatar_url')
      }
    })
  },

  // 选择封面
  onChooseCover() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        this.uploadImage(tempFilePath, 'teacher_cover_image')
      }
    })
  },

  // 上传图片
  uploadImage(filePath, field) {
    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')

    wx.showLoading({ title: '上传中...' })
    const header = {}
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }
    wx.uploadFile({
      url: `${app.globalData.apiUrl}/api/upload/image`,
      filePath: filePath,
      name: 'image',
      header: header,
      success: (res) => {
        wx.hideLoading()
        const data = JSON.parse(res.data)
        if (data.code === 200) {
          this.setData({
            [`teacherInfo.${field}`]: data.data.image_url
          })
          wx.showToast({
            title: '上传成功',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: data.message || '上传失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('上传图片失败:', err)
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        })
      }
    })
  },

  // 保存
  onSave() {
    // 验证必填项
    if (!this.data.teacherInfo.real_name) {
      wx.showToast({
        title: '请输入真实姓名',
        icon: 'none'
      })
      return
    }

    if (!this.data.teacherInfo.phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      })
      return
    }

    const openid = wx.getStorageSync('openid')
    const userId = wx.getStorageSync('userId')
    wx.showLoading({ title: '保存中...' })

    const header = { 'Content-Type': 'application/json' }
    if (openid) { header['OpenId'] = openid } else if (userId) { header['User-Id'] = userId }
    wx.request({
      url: `${app.globalData.apiUrl}/api/users/profile`,
      method: 'PUT',
      header: header,
      data: this.data.teacherInfo,
      success: (res) => {
        wx.hideLoading()
        if (res.data.code === 200) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
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
  }
})
