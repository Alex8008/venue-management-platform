const api = require('./api')
const app = getApp()
const envConfig = require('../config/env')

const DEBUG_MODE = envConfig.debugMode === true

function triggerPayment(type, orderId, totalAmount) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('====== triggerPayment 开始 ======')
      console.log('type:', type)
      console.log('orderId:', orderId)
      console.log('totalAmount:', totalAmount)
      console.log('DEBUG_MODE:', DEBUG_MODE)
      console.log('apiUrl:', app.globalData.apiUrl)
      console.log('openid:', wx.getStorageSync('openid'))
      console.log('userId:', wx.getStorageSync('userId'))

      wx.showLoading({ title: '创建支付订单...' })

      console.log('>>> 调用 api.createPaymentOrder ...')
      const result = await api.createPaymentOrder({
        type: type,
        order_id: orderId,
        total_amount: totalAmount
      })

      wx.hideLoading()

      console.log('>>> createPaymentOrder 返回结果:', JSON.stringify(result))

      if (!result.success) {
        console.error('>>> 创建支付订单失败:', result.message)
        reject(new Error(result.message || '创建支付订单失败'))
        return
      }

      const payParams = result.data
      console.log('>>> 支付参数:', JSON.stringify(payParams))

      // DEBUG模式：跳过真实微信支付
      if (DEBUG_MODE) {
        console.log('>>> DEBUG模式：跳过真实支付，调用模拟成功接口')

        wx.showLoading({ title: '模拟支付中...' })

        const openid = wx.getStorageSync('openid')
        const userId = wx.getStorageSync('userId')
        const header = { 'Content-Type': 'application/json' }
        if (openid) { header['OpenId'] = openid }
        else if (userId) { header['User-Id'] = userId }

        console.log('>>> 请求头:', JSON.stringify(header))

        // 第一步：获取 out_trade_no
        const getTradeNoUrl = `${app.globalData.apiUrl}/api/payment/get-trade-no`
        console.log('>>> 获取 trade-no URL:', getTradeNoUrl)
        console.log('>>> 参数: type=', type, 'order_id=', orderId)

        wx.request({
          url: getTradeNoUrl,
          method: 'GET',
          header,
          data: { type, order_id: orderId },
          success: (res) => {
            console.log('>>> get-trade-no 响应状态码:', res.statusCode)
            console.log('>>> get-trade-no 响应数据:', JSON.stringify(res.data))

            if (!res.data.success) {
              wx.hideLoading()
              console.error('>>> 获取订单号失败:', res.data.message)
              reject(new Error(res.data.message || '获取订单号失败'))
              return
            }

            const tradeNo = res.data.data.out_trade_no
            console.log('>>> 获取到 out_trade_no:', tradeNo)

            // 第二步：调用模拟支付成功接口
            const mockSuccessUrl = `${app.globalData.apiUrl}/api/payment/mock-success`
            console.log('>>> 模拟支付 URL:', mockSuccessUrl)
            console.log('>>> 模拟支付数据: { out_trade_no:', tradeNo, '}')

            wx.request({
              url: mockSuccessUrl,
              method: 'POST',
              header,
              data: { out_trade_no: tradeNo },
              success: (mockRes) => {
                wx.hideLoading()
                console.log('>>> mock-success 响应状态码:', mockRes.statusCode)
                console.log('>>> mock-success 响应数据:', JSON.stringify(mockRes.data))

                if (mockRes.data.success) {
                  console.log('>>> 模拟支付成功!')
                  resolve({ success: true, message: '模拟支付成功' })
                } else {
                  console.error('>>> 模拟支付失败:', mockRes.data.message)
                  reject(new Error(mockRes.data.message || '模拟支付失败'))
                }
              },
              fail: (err) => {
                wx.hideLoading()
                console.error('>>> mock-success 请求失败:', JSON.stringify(err))
                reject(new Error('模拟支付请求失败'))
              }
            })
          },
          fail: (err) => {
            wx.hideLoading()
            console.error('>>> get-trade-no 请求失败:', JSON.stringify(err))
            reject(new Error('获取订单号请求失败'))
          }
        })
        return
      }

      // 正式环境：调用真实微信支付
      console.log('>>> 正式环境：调用 wx.requestPayment')
      console.log('>>> timeStamp:', payParams.timeStamp)
      console.log('>>> nonceStr:', payParams.nonceStr)
      console.log('>>> package:', payParams.package)
      console.log('>>> signType:', payParams.signType)
      console.log('>>> paySign:', payParams.paySign)

      wx.requestPayment({
        timeStamp: payParams.timeStamp,
        nonceStr:  payParams.nonceStr,
        package:   payParams.package,
        signType:  payParams.signType,
        paySign:   payParams.paySign,
        success: (payRes) => {
          console.log('>>> wx.requestPayment 成功:', JSON.stringify(payRes))
          resolve({ success: true, message: '支付成功' })
        },
        fail: (err) => {
          console.error('>>> wx.requestPayment 失败:', JSON.stringify(err))
          if (err.errMsg === 'requestPayment:fail cancel') {
            resolve({ success: false, message: '支付取消', cancelled: true })
          } else {
            reject(new Error(err.errMsg || '支付失败'))
          }
        }
      })

    } catch (error) {
      wx.hideLoading()
      console.error('>>> triggerPayment 异常:', error.message || error)
      console.error('>>> 异常堆栈:', error.stack || '无堆栈')
      reject(error)
    }
  })
}

module.exports = { triggerPayment }
