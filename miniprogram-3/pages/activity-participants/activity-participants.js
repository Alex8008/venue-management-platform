const api = require('../../utils/api')

Page({
  data: {
    activityId: 0,
    activityTitle: '',
    participants: [],
    loading: false
  },

  onLoad(options) {
    const activityId = parseInt(options.id)
    const activityTitle = options.title || '活动'
    this.setData({ 
      activityId,
      activityTitle
    })
    this.loadParticipants()
  },

  async loadParticipants() {
    this.setData({ loading: true })
    
    try {
      const result = await api.adminGetRegistrations({
        activity_id: this.data.activityId,
        status: 'approved'
      })
      
      if (result.success) {
        this.setData({
          participants: result.data || []
        })
      }
    } catch (error) {
      console.error('加载参与人员失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
    
    this.setData({ loading: false })
  },

  onParticipantClick(e) {
    const userId = e.currentTarget.dataset.userId
    const userName = e.currentTarget.dataset.userName
    
    wx.navigateTo({
      url: `/pages/user-detail/user-detail?id=${userId}&name=${userName}`
    })
  },

  async onExportInsurance() {
    wx.showLoading({ title: '生成中...', mask: true })
    
    try {
      const result = await api.exportInsurance(this.data.activityId)
      
      if (result.success) {
        const fileUrl = result.data.file_url
        const filename = result.data.filename
        
        console.log('导出成功，开始下载文件:', fileUrl)
        
        wx.downloadFile({
          url: fileUrl,
          success: (downloadRes) => {
            wx.hideLoading()
            
            if (downloadRes.statusCode === 200) {
              const tempFilePath = downloadRes.tempFilePath
              
              console.log('文件下载成功，临时路径:', tempFilePath)
              
              // 获取文件信息
              wx.getFileInfo({
                filePath: tempFilePath,
                success: (fileInfo) => {
                  console.log('文件大小:', fileInfo.size, 'bytes')
                  
                  // 尝试分享文件
                  wx.shareFileMessage({
                    filePath: tempFilePath,
                    fileName: filename,
                    success: () => {
                      console.log('文件分享成功')
                      wx.showToast({
                        title: '分享成功',
                        icon: 'success'
                      })
                    },
                    fail: (shareErr) => {
                      console.error('分享失败:', shareErr)
                      
                      // 分享失败时提供下载链接
                      wx.showModal({
                        title: '无法直接分享',
                        content: `文件大小: ${(fileInfo.size / 1024).toFixed(2)}KB\n\n点击"复制链接"在浏览器中下载`,
                        confirmText: '复制链接',
                        cancelText: '取消',
                        success: (modalRes) => {
                          if (modalRes.confirm) {
                            wx.setClipboardData({
                              data: fileUrl,
                              success: () => {
                                wx.showToast({
                                  title: '链接已复制',
                                  icon: 'success'
                                })
                              }
                            })
                          }
                        }
                      })
                    }
                  })
                },
                fail: (fileInfoErr) => {
                  console.error('获取文件信息失败:', fileInfoErr)
                  
                  // 即使获取不到文件信息，也尝试分享
                  wx.shareFileMessage({
                    filePath: tempFilePath,
                    fileName: filename,
                    success: () => {
                      console.log('文件分享成功')
                      wx.showToast({
                        title: '分享成功',
                        icon: 'success'
                      })
                    },
                    fail: (shareErr) => {
                      console.error('分享失败:', shareErr)
                      
                      wx.showModal({
                        title: '无法分享',
                        content: '点击"复制链接"在浏览器中下载',
                        confirmText: '复制链接',
                        cancelText: '取消',
                        success: (modalRes) => {
                          if (modalRes.confirm) {
                            wx.setClipboardData({
                              data: fileUrl,
                              success: () => {
                                wx.showToast({
                                  title: '链接已复制',
                                  icon: 'success'
                                })
                              }
                            })
                          }
                        }
                      })
                    }
                  })
                }
              })
            } else {
              wx.showToast({
                title: '文件下载失败',
                icon: 'none'
              })
            }
          },
          fail: (downloadErr) => {
            wx.hideLoading()
            console.error('下载失败:', downloadErr)
            
            wx.showModal({
              title: '下载失败',
              content: '点击"复制链接"在浏览器中下载',
              confirmText: '复制链接',
              cancelText: '取消',
              success: (res) => {
                if (res.confirm) {
                  wx.setClipboardData({
                    data: fileUrl,
                    success: () => {
                      wx.showToast({
                        title: '链接已复制',
                        icon: 'success'
                      })
                    }
                  })
                }
              }
            })
          }
        })
      } else {
        wx.hideLoading()
        wx.showToast({
          title: result.message || '导出失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('导出异常:', error)
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      })
    }
  },

  onPullDownRefresh() {
    this.loadParticipants()
    wx.stopPullDownRefresh()
  },

  async onExportNoInsurance() {
    wx.showLoading({ title: '生成中...', mask: true })
    
    try {
      const result = await api.exportNoInsurance(this.data.activityId)
      
      if (result.success) {
        const fileUrl = result.data.file_url
        const filename = result.data.filename
        
        console.log('导出成功，开始下载文件:', fileUrl)
        
        wx.downloadFile({
          url: fileUrl,
          success: (downloadRes) => {
            wx.hideLoading()
            
            if (downloadRes.statusCode === 200) {
              const tempFilePath = downloadRes.tempFilePath
              
              console.log('文件下载成功，临时路径:', tempFilePath)
              
              wx.getFileInfo({
                filePath: tempFilePath,
                success: (fileInfo) => {
                  console.log('文件大小:', fileInfo.size, 'bytes')
                  
                  wx.shareFileMessage({
                    filePath: tempFilePath,
                    fileName: filename,
                    success: () => {
                      console.log('文件分享成功')
                      wx.showToast({
                        title: '分享成功',
                        icon: 'success'
                      })
                    },
                    fail: (shareErr) => {
                      console.error('分享失败:', shareErr)
                      
                      wx.showModal({
                        title: '无法直接分享',
                        content: `文件大小: ${(fileInfo.size / 1024).toFixed(2)}KB\n\n点击"复制链接"在浏览器中下载`,
                        confirmText: '复制链接',
                        cancelText: '取消',
                        success: (modalRes) => {
                          if (modalRes.confirm) {
                            wx.setClipboardData({
                              data: fileUrl,
                              success: () => {
                                wx.showToast({
                                  title: '链接已复制',
                                  icon: 'success'
                                })
                              }
                            })
                          }
                        }
                      })
                    }
                  })
                },
                fail: (fileInfoErr) => {
                  console.error('获取文件信息失败:', fileInfoErr)
                  
                  wx.shareFileMessage({
                    filePath: tempFilePath,
                    fileName: filename,
                    success: () => {
                      console.log('文件分享成功')
                      wx.showToast({
                        title: '分享成功',
                        icon: 'success'
                      })
                    },
                    fail: (shareErr) => {
                      console.error('分享失败:', shareErr)
                      
                      wx.showModal({
                        title: '无法分享',
                        content: '点击"复制链接"在浏览器中下载',
                        confirmText: '复制链接',
                        cancelText: '取消',
                        success: (modalRes) => {
                          if (modalRes.confirm) {
                            wx.setClipboardData({
                              data: fileUrl,
                              success: () => {
                                wx.showToast({
                                  title: '链接已复制',
                                  icon: 'success'
                                })
                              }
                            })
                          }
                        }
                      })
                    }
                  })
                }
              })
            } else {
              wx.showToast({
                title: '文件下载失败',
                icon: 'none'
              })
            }
          },
          fail: (downloadErr) => {
            wx.hideLoading()
            console.error('下载失败:', downloadErr)
            
            wx.showModal({
              title: '下载失败',
              content: '点击"复制链接"在浏览器中下载',
              confirmText: '复制链接',
              cancelText: '取消',
              success: (res) => {
                if (res.confirm) {
                  wx.setClipboardData({
                    data: fileUrl,
                    success: () => {
                      wx.showToast({
                        title: '链接已复制',
                        icon: 'success'
                      })
                    }
                  })
                }
              }
            })
          }
        })
      } else {
        wx.hideLoading()
        wx.showToast({
          title: result.message || '导出失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('导出异常:', error)
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      })
    }
  }
})