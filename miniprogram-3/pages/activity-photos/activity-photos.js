const api = require('../../utils/api')

Page({
  data: {
    activityId: 0,
    activityTitle: '',
    photos: [],
    selectMode: false,
    selectedPhotos: [],
    isAdmin: false
  },

  onLoad(options) {
    this.setData({
      activityId: parseInt(options.id),
      activityTitle: options.title || '活动照片'
    })
    this.checkAdminRole()
    this.loadPhotos()
  },

  async checkAdminRole() {
    try {
      const result = await api.checkAdmin()
      this.setData({
        isAdmin: result.success
      })
      console.log('管理员权限检查:', result.success)
    } catch (error) {
      this.setData({
        isAdmin: false
      })
      console.log('非管理员用户')
    }
  },

  async loadPhotos() {
    try {
      const result = await api.getActivityPhotos(this.data.activityId)
      
      if (result.success) {
        this.setData({
          photos: result.data || []
        })
      }
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  onToggleSelectMode() {
    this.setData({
      selectMode: !this.data.selectMode,
      selectedPhotos: []
    })
  },

  onSelectPhoto(e) {
    if (!this.data.selectMode) return
    
    const photoId = e.currentTarget.dataset.id
    let selectedPhotos = [...this.data.selectedPhotos]
    
    const index = selectedPhotos.indexOf(photoId)
    if (index > -1) {
      selectedPhotos.splice(index, 1)
    } else {
      selectedPhotos.push(photoId)
    }
    
    this.setData({
      selectedPhotos
    })
  },

  onPhotoClick(e) {
    if (this.data.selectMode) {
      this.onSelectPhoto(e)
      return
    }
    
    const index = e.currentTarget.dataset.index
    const urls = this.data.photos.map(p => p.photo_url)
    
    wx.previewImage({
      urls: urls,
      current: urls[index]
    })
  },

  async onBatchDelete() {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '仅管理员可删除照片',
        icon: 'none'
      })
      return
    }

    if (this.data.selectedPhotos.length === 0) {
      wx.showToast({
        title: '请选择要删除的照片',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的 ${this.data.selectedPhotos.length} 张照片吗？\n删除后无法恢复！`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })

          let successCount = 0
          
          for (const photoId of this.data.selectedPhotos) {
            try {
              const result = await api.deleteActivityPhoto(photoId)
              if (result.success) {
                successCount++
              }
            } catch (error) {
              console.error(`删除照片${photoId}失败:`, error)
            }
          }

          wx.hideLoading()

          wx.showToast({
            title: `成功删除${successCount}张照片`,
            icon: 'success'
          })

          this.setData({
            selectMode: false,
            selectedPhotos: []
          })

          this.loadPhotos()
        }
      }
    })
  },

  async onBatchDownload() {
    if (this.data.selectedPhotos.length === 0) {
      wx.showToast({
        title: '请选择要下载的照片',
        icon: 'none'
      })
      return
    }

    // 先请求相册权限
    try {
      const setting = await new Promise((resolve, reject) => {
        wx.getSetting({
          success: resolve,
          fail: reject
        })
      })

      if (!setting.authSetting['scope.writePhotosAlbum']) {
        await new Promise((resolve, reject) => {
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: resolve,
            fail: () => {
              wx.showModal({
                title: '需要相册权限',
                content: '请在设置中允许保存图片到相册',
                confirmText: '去设置',
                success: (res) => {
                  if (res.confirm) {
                    wx.openSetting()
                  }
                }
              })
              reject(new Error('用户拒绝相册权限'))
            }
          })
        })
      }
    } catch (e) {
      console.error('权限检查失败:', e)
      return
    }

    wx.showLoading({ title: '下载中...' })

    let successCount = 0
    const selectedUrls = this.data.photos
      .filter(p => this.data.selectedPhotos.includes(p.id))
      .map(p => p.photo_url)

    for (let i = 0; i < selectedUrls.length; i++) {
      try {
        await this.downloadImage(selectedUrls[i])
        successCount++
      } catch (error) {
        console.error(`下载第${i + 1}张失败:`, error)
      }
    }

    wx.hideLoading()

    wx.showToast({
      title: `成功保存${successCount}张照片`,
      icon: 'success'
    })

    this.setData({
      selectMode: false,
      selectedPhotos: []
    })
  },

  onPullDownRefresh() {
    this.loadPhotos()
    wx.stopPullDownRefresh()
  },

  downloadImage(url) {
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url: url,
        success: (res) => {
          if (res.statusCode === 200) {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                console.log('保存成功:', url)
                resolve(true)
              },
              fail: (err) => {
                console.error('保存到相册失败:', err)
                reject(err)
              }
            })
          } else {
            reject(new Error('下载失败，状态码：' + res.statusCode))
          }
        },
        fail: (err) => {
          console.error('下载文件失败:', err)
          reject(err)
        }
      })
    })
  },


  onUploadPhoto() {
    wx.navigateBack()
  }
})