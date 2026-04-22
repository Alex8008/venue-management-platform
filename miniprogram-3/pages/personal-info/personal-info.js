const api = require('../../utils/api')


Page({
  data: {
    userProfile: {},
    genderOptions: ['男', '女'],
    bloodTypeOptions: ['A型', 'B型', 'O型', 'AB型']
  },


  onLoad() {
    this.loadUserProfile()
  },


  onShow() {
    this.loadUserProfile()
  },


  onPullDownRefresh() {
    this.loadUserProfile()
    wx.stopPullDownRefresh()
  },


  async loadUserProfile() {
    try {
      wx.showLoading({ title: '加载中...' })
      const result = await api.getUserProfile()
      wx.hideLoading()
      if (result.success) {
        this.setData({ userProfile: result.data })
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('加载用户资料失败:', error)
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },


  // ★ 修复：使用 open-type="chooseAvatar" 的回调
  onChooseWechatAvatar(e) {
    const avatarUrl = e.detail.avatarUrl
    if (!avatarUrl) {
      wx.showToast({ title: '获取头像失败', icon: 'none' })
      return
    }
    console.log('获取到微信头像临时路径:', avatarUrl)


    // 微信头像返回的是临时文件路径，需要上传到服务器
    wx.showLoading({ title: '上传中...', mask: true })
    api.uploadImage(avatarUrl).then(uploadResult => {
      wx.hideLoading()
      if (uploadResult.success) {
        const imageUrl = uploadResult.data.image_url
        this.setData({ 'userProfile.avatar_url': imageUrl })
        // 立即保存到服务器
        api.updateUserProfile({ avatar_url: imageUrl }).then(() => {
          wx.showToast({ title: '头像已更新', icon: 'success' })
        }).catch(e => {
          console.error('保存头像失败:', e)
        })
      } else {
        wx.showToast({ title: uploadResult.message || '上传失败', icon: 'none' })
      }
    }).catch(error => {
      wx.hideLoading()
      console.error('上传头像失败:', error)
      wx.showToast({ title: '上传失败', icon: 'none' })
    })
  },


  // 方式二：上传自定义照片
  onUploadAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0]
        wx.showLoading({ title: '上传中...', mask: true })
        try {
          const uploadResult = await api.uploadImage(tempFilePath)
          wx.hideLoading()
          if (uploadResult.success) {
            const imageUrl = uploadResult.data.image_url
            this.setData({ 'userProfile.avatar_url': imageUrl })
            try {
              await api.updateUserProfile({ avatar_url: imageUrl })
              wx.showToast({ title: '头像已更新', icon: 'success' })
            } catch (e) {
              console.error('保存头像失败:', e)
            }
          } else {
            wx.showToast({ title: uploadResult.message || '上传失败', icon: 'none' })
          }
        } catch (error) {
          wx.hideLoading()
          console.error('上传头像失败:', error)
          wx.showToast({ title: '上传失败', icon: 'none' })
        }
      }
    })
  },


  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    this.setData({ [`userProfile.${field}`]: value })
  },


  onGenderChange(e) {
    const index = e.detail.value
    const gender = this.data.genderOptions[index]
    this.setData({ 'userProfile.gender': gender })
  },


  onBloodTypeChange(e) {
    const index = e.detail.value
    const bloodType = this.data.bloodTypeOptions[index]
    this.setData({ 'userProfile.blood_type': bloodType })
  },


  async onSaveProfile() {
    const profile = this.data.userProfile


    if (!profile.real_name || profile.real_name.trim() === '' || profile.real_name === '微信用户') {
      wx.showToast({ title: '请填写真实姓名', icon: 'none' })
      return
    }


    if (!profile.phone || profile.phone.trim() === '' || profile.phone.startsWith('t')) {
      wx.showToast({ title: '请填写手机号', icon: 'none' })
      return
    }


    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(profile.phone.trim())) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }


    if (!profile.gender) {
      wx.showToast({ title: '请选择性别', icon: 'none' })
      return
    }


    if (!profile.age || parseInt(profile.age) <= 0) {
      wx.showToast({ title: '请填写年龄', icon: 'none' })
      return
    }


    try {
      wx.showLoading({ title: '保存中...' })
      const result = await api.updateUserProfile(this.data.userProfile)
      wx.hideLoading()
      if (result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({ title: result.message || '保存失败', icon: 'none' })
      }
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  }
})
