const api = require('../../utils/api')

Page({
  data: {
    certificate_image_url: '',
    start_date: '',
    start_time: '00:00',
    end_date: '',
    end_time: '23:59',
    uploading: false
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
              certificate_image_url: result.data.image_url,
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

  onStartDateChange(e) {
    this.setData({
      start_date: e.detail.value
    })
  },

  onStartTimeChange(e) {
    this.setData({
      start_time: e.detail.value
    })
  },

  onEndDateChange(e) {
    this.setData({
      end_date: e.detail.value
    })
  },

  onEndTimeChange(e) {
    this.setData({
      end_time: e.detail.value
    })
  },

  async onSubmit() {
    const { certificate_image_url, start_date, start_time, end_date, end_time } = this.data
    
    if (!certificate_image_url) {
      wx.showToast({ title: '请上传保险凭证', icon: 'none' })
      return
    }
    
    if (!start_date || !end_date) {
      wx.showToast({ title: '请选择保障时间', icon: 'none' })
      return
    }

    wx.showLoading({ title: '提交中...' })

    try {
      const result = await api.submitInsurance({
        certificate_image_url,
        start_date: `${start_date} ${start_time}:00`,
        end_date: `${end_date} ${end_time}:00`
      })

      wx.hideLoading()

      if (result.success) {
        wx.showToast({
          title: '提交成功，等待审核',
          icon: 'success'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: result.message || '提交失败',
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