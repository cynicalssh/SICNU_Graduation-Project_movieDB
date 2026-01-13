Page({
  data: {
    filmId: '',
    filmTitle: '',
    cinemaId: '',
    cinemaName: '',
    scheduleId: '',
    schedule: null,
    seatMap: [],
    selectedSeats: [],
    selectedSeatsText: '',
    totalPrice: 0,
    maxSeats: 4
  },

  onLoad: function(options) {
    var that = this
    var filmId = options.filmId || ''
    var filmTitle = options.filmTitle || ''
    var cinemaId = options.cinemaId || ''
    var cinemaName = options.cinemaName || ''
    var scheduleId = options.scheduleId || ''
    var scheduleStr = options.schedule || '{}'
    
    var schedule = {}
    try {
      schedule = JSON.parse(decodeURIComponent(scheduleStr))
    } catch (e) {
      console.error('解析场次信息失败:', e)
    }
    
    that.setData({
      filmId: filmId,
      filmTitle: decodeURIComponent(filmTitle),
      cinemaId: cinemaId,
      cinemaName: decodeURIComponent(cinemaName),
      scheduleId: scheduleId,
      schedule: schedule
    })
    
    // 初始化座位图
    that.initSeatMap()
  },

  // 初始化座位图（模拟数据）
  initSeatMap: function() {
    var that = this
    // 生成座位图：10行，每行12个座位
    var rows = 10
    var cols = 12
    var seatMap = []
    
    for (var i = 0; i < rows; i++) {
      var row = []
      var rowLabel = String.fromCharCode(65 + i) // A, B, C...
      for (var j = 0; j < cols; j++) {
        var seatNum = j + 1
        var seatId = rowLabel + seatNum
        // 随机设置一些座位为已售
        var isSold = Math.random() < 0.2
        row.push({
          id: seatId,
          row: rowLabel,
          col: seatNum,
          status: isSold ? 'sold' : 'available', // available, sold, selected
          price: that.data.schedule.price || 45
        })
      }
      seatMap.push({
        rowLabel: rowLabel,
        seats: row
      })
    }
    
    that.setData({
      seatMap: seatMap
    })
  },

  // 选择座位
  selectSeat: function(e) {
    var that = this
    var seatId = e.currentTarget.dataset.id
    var rowIndex = e.currentTarget.dataset.row
    var colIndex = e.currentTarget.dataset.col
    
    var seatMap = that.data.seatMap
    var seat = seatMap[rowIndex].seats[colIndex]
    
    // 如果座位已售，不能选择
    if (seat.status === 'sold') {
      wx.showToast({
        title: '该座位已售',
        icon: 'none',
        duration: 1500
      })
      return
    }
    
    // 如果座位已选中，则取消选择
    if (seat.status === 'selected') {
      seat.status = 'available'
      // 从已选座位列表中移除
      var selectedSeats = that.data.selectedSeats.filter(function(s) {
        return s.id !== seatId
      })
      that.setData({
        selectedSeats: selectedSeats,
        seatMap: seatMap
      })
    } else {
      // 检查是否超过最大选择数量
      if (that.data.selectedSeats.length >= that.data.maxSeats) {
        wx.showToast({
          title: '最多选择' + that.data.maxSeats + '个座位',
          icon: 'none',
          duration: 1500
        })
        return
      }
      
      // 选择座位
      seat.status = 'selected'
      var selectedSeats = that.data.selectedSeats.concat([{
        id: seat.id,
        row: seat.row,
        col: seat.col,
        price: seat.price
      }])
      that.setData({
        selectedSeats: selectedSeats,
        seatMap: seatMap
      })
    }
    
    // 计算总价和更新已选座位文本
    that.calculateTotalPrice()
    that.updateSelectedSeatsText()
  },

  // 计算总价
  calculateTotalPrice: function() {
    var that = this
    var totalPrice = 0
    that.data.selectedSeats.forEach(function(seat) {
      totalPrice += seat.price
    })
    that.setData({
      totalPrice: totalPrice
    })
  },

  // 更新已选座位文本
  updateSelectedSeatsText: function() {
    var that = this
    var selectedSeatsText = that.data.selectedSeats.map(function(seat) {
      return seat.row + seat.col
    }).join('、')
    that.setData({
      selectedSeatsText: selectedSeatsText
    })
  },

  // 确认选座
  confirmSeats: function() {
    var that = this
    if (that.data.selectedSeats.length === 0) {
      wx.showToast({
        title: '请选择座位',
        icon: 'none',
        duration: 1500
      })
      return
    }
    
    var filmId = that.data.filmId
    var filmTitle = that.data.filmTitle
    var cinemaId = that.data.cinemaId
    var cinemaName = that.data.cinemaName
    var scheduleId = that.data.scheduleId
    var schedule = that.data.schedule
    var selectedSeats = that.data.selectedSeats
    var totalPrice = that.data.totalPrice
    
    wx.navigateTo({
      url: '../orderConfirm/orderConfirm?filmId=' + filmId + 
           '&filmTitle=' + encodeURIComponent(filmTitle) + 
           '&cinemaId=' + cinemaId + 
           '&cinemaName=' + encodeURIComponent(cinemaName) +
           '&scheduleId=' + scheduleId +
           '&schedule=' + encodeURIComponent(JSON.stringify(schedule)) +
           '&seats=' + encodeURIComponent(JSON.stringify(selectedSeats)) +
           '&totalPrice=' + totalPrice
    })
  }
})

