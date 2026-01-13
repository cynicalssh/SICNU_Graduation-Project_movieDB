var priceUtil = require('../../util/priceUtil')

Page({
  data: {
    filmId: '',
    filmTitle: '',
    cinemaId: '',
    cinemaName: '',
    cinemaBrand: '',
    cinemaAddress: '',
    cinemaLatitude: 0,
    cinemaLongitude: 0,
    filmRating: 0,
    selectedDate: '',
    scheduleList: []
  },

  onLoad: function(options) {
    var that = this
    var filmId = options.filmId || ''
    var filmTitle = options.filmTitle || ''
    var cinemaId = options.cinemaId || ''
    var cinemaName = options.cinemaName || ''
    var cinemaBrand = options.cinemaBrand ? decodeURIComponent(options.cinemaBrand) : ''
    var cinemaAddress = options.address ? decodeURIComponent(options.address) : ''
    var cinemaLatitude = parseFloat(options.latitude) || 0
    var cinemaLongitude = parseFloat(options.longitude) || 0
    var filmRating = parseFloat(options.filmRating || 0)
    
    // 获取今天的日期
    var today = new Date()
    var todayStr = that.formatDate(today)
    
    that.setData({
      filmId: filmId,
      filmTitle: decodeURIComponent(filmTitle),
      cinemaId: cinemaId,
      cinemaName: decodeURIComponent(cinemaName),
      cinemaBrand: cinemaBrand,
      cinemaAddress: cinemaAddress,
      cinemaLatitude: cinemaLatitude,
      cinemaLongitude: cinemaLongitude,
      filmRating: filmRating,
      selectedDate: todayStr,
      dateList: that.getDateList()
    })
    
    // 如果没有评分，尝试从电影详情获取
    if (!filmRating && filmId) {
      that.loadFilmRating(filmId)
    }
    
    // 加载场次列表
    that.loadScheduleList(todayStr)
  },

  // 加载电影评分（如果未传递）
  loadFilmRating: function(filmId) {
    var that = this
    // 尝试从本地存储或其他地方获取，这里简化处理
    // 实际可以从API获取电影详情
  },

  // 格式化日期
  formatDate: function(date) {
    var year = date.getFullYear()
    var month = (date.getMonth() + 1).toString().padStart(2, '0')
    var day = date.getDate().toString().padStart(2, '0')
    return year + '-' + month + '-' + day
  },

  // 选择日期
  selectDate: function(e) {
    var that = this
    var date = e.currentTarget.dataset.date
    that.setData({
      selectedDate: date
    })
    that.loadScheduleList(date)
  },

  // 加载场次列表（模拟数据）
  loadScheduleList: function(date) {
    var that = this
    // 场次时间段配置
    var timeSlots = [
      { time: '09:00', type: '上午' },
      { time: '10:30', type: '上午' },
      { time: '12:00', type: '下午' },
      { time: '14:30', type: '下午' },
      { time: '16:00', type: '下午' },
      { time: '18:30', type: '晚上' },
      { time: '20:00', type: '晚上' },
      { time: '21:30', type: '晚上' },
      { time: '23:00', type: '晚上' }
    ]
    
    // 使用价格工具计算每个场次的价格
    var schedules = []
    timeSlots.forEach(function(slot, index) {
      // 计算票价
      var price = priceUtil.calculateTicketPrice(
        that.data.cinemaId,
        that.data.cinemaName,
        that.data.cinemaBrand,
        that.data.filmId,
        that.data.filmTitle,
        that.data.filmRating,
        slot.time
      )
      
      schedules.push({
        id: 'schedule_' + date + '_' + index,
        time: slot.time,
        price: price,
        type: slot.type,
        hall: '厅' + (index % 5 + 1),
        language: '国语',
        date: date
      })
    })
    
    // 按时间段分组
    var scheduleGroup = that.groupSchedulesByType(schedules)
    
    that.setData({
      scheduleList: schedules,
      scheduleGroup: scheduleGroup
    })
  },

  // 按时间段分组
  groupSchedulesByType: function(schedules) {
    var groups = {}
    schedules.forEach(function(schedule) {
      if (!groups[schedule.type]) {
        groups[schedule.type] = {
          type: schedule.type,
          schedules: []
        }
      }
      groups[schedule.type].schedules.push(schedule)
    })
    return Object.values(groups)
  },

  // 选择场次
  selectSchedule: function(e) {
    var that = this
    var scheduleId = e.currentTarget.dataset.id
    var schedule = e.currentTarget.dataset.schedule
    var filmId = that.data.filmId
    var filmTitle = that.data.filmTitle
    var cinemaId = that.data.cinemaId
    var cinemaName = that.data.cinemaName
    
    wx.navigateTo({
      url: '../seatSelect/seatSelect?filmId=' + filmId + 
           '&filmTitle=' + encodeURIComponent(filmTitle) + 
           '&cinemaId=' + cinemaId + 
           '&cinemaName=' + encodeURIComponent(cinemaName) +
           '&scheduleId=' + scheduleId +
           '&schedule=' + encodeURIComponent(JSON.stringify(schedule))
    })
  },

  // 获取日期列表（今天和明天）
  getDateList: function() {
    var that = this
    var dates = []
    var today = new Date()
    var tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    dates.push({
      date: that.formatDate(today),
      label: '今天',
      weekDay: that.getWeekDay(today)
    })
    dates.push({
      date: that.formatDate(tomorrow),
      label: '明天',
      weekDay: that.getWeekDay(tomorrow)
    })
    
    return dates
  },

  // 获取星期
  getWeekDay: function(date) {
    var weekDays = ['日', '一', '二', '三', '四', '五', '六']
    return weekDays[date.getDay()]
  },

  // 显示影院地图（直接打开系统地图）
  showCinemaMap: function() {
    var that = this
    var cinemaName = that.data.cinemaName
    var cinemaAddress = that.data.cinemaAddress
    var latitude = parseFloat(that.data.cinemaLatitude)
    var longitude = parseFloat(that.data.cinemaLongitude)
    
    // 如果还没有坐标，提示用户
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      wx.showToast({
        title: '该影院暂无位置信息',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    // 直接打开系统地图选择器
    wx.openLocation({
      latitude: latitude,
      longitude: longitude,
      name: cinemaName || '影院位置',
      address: cinemaAddress || '',
      scale: 18,  // 地图缩放级别，范围5-18
      success: function(res) {
        console.log('打开地图成功', res)
      },
      fail: function(err) {
        console.error('打开地图失败', err)
        wx.showToast({
          title: '打开地图失败，请检查位置权限',
          icon: 'none',
          duration: 2000
        })
      }
    })
  }
})

