Page({
  data: {
    filmId: '',
    filmTitle: '',
    cinemaId: '',
    cinemaName: '',
    scheduleId: '',
    schedule: null,
    seats: [],
    totalPrice: 0,
    orderId: ''
  },

  onLoad: function(options) {
    var that = this
    var filmId = options.filmId || ''
    var filmTitle = options.filmTitle || ''
    var cinemaId = options.cinemaId || ''
    var cinemaName = options.cinemaName || ''
    var scheduleId = options.scheduleId || ''
    var scheduleStr = options.schedule || '{}'
    var seatsStr = options.seats || '[]'
    var totalPrice = parseFloat(options.totalPrice || 0)
    
    var schedule = {}
    var seats = []
    try {
      schedule = JSON.parse(decodeURIComponent(scheduleStr))
      seats = JSON.parse(decodeURIComponent(seatsStr))
    } catch (e) {
      console.error('解析订单信息失败:', e)
    }
    
    // 生成订单号
    var orderId = 'ORD' + Date.now()
    
    that.setData({
      filmId: filmId,
      filmTitle: decodeURIComponent(filmTitle),
      cinemaId: cinemaId,
      cinemaName: decodeURIComponent(cinemaName),
      scheduleId: scheduleId,
      schedule: schedule,
      seats: seats,
      totalPrice: totalPrice,
      orderId: orderId,
      seatsText: that.formatSeatsText(seats),
      scheduleText: that.formatScheduleText(schedule)
    })
  },

  // 格式化座位文本
  formatSeatsText: function(seats) {
    if (!seats || seats.length === 0) return ''
    return seats.map(function(seat) {
      return seat.row + seat.col
    }).join('、')
  },

  // 格式化场次文本
  formatScheduleText: function(schedule) {
    if (!schedule) return ''
    return schedule.date + ' ' + schedule.time + ' ' + schedule.hall
  },

  // 格式化座位信息
  formatSeats: function() {
    var that = this
    return that.data.seats.map(function(seat) {
      return seat.row + seat.col
    }).join('、')
  },

  // 格式化场次信息
  formatSchedule: function() {
    var that = this
    var schedule = that.data.schedule
    if (!schedule) return ''
    return schedule.date + ' ' + schedule.time + ' ' + schedule.hall
  },

  // 确认下单
  confirmOrder: function() {
    var that = this
    wx.showLoading({
      title: '下单中...',
      mask: true
    })
    
    // 模拟下单过程
    setTimeout(function() {
      wx.hideLoading()
      wx.showModal({
        title: '下单成功',
        content: '订单号：' + that.data.orderId + '\n\n您的订单已成功提交！',
        showCancel: false,
        confirmText: '确定',
        success: function() {
          // 返回电影详情页
          wx.navigateBack({
            delta: 4
          })
        }
      })
    }, 1500)
  }
})

