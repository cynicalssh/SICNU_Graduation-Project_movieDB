var douban = require('../../comm/script/fetch')
var config = require('../../comm/script/config')
var priceUtil = require('../../util/priceUtil')

Page({
  data: {
    cinemaId: '',
    cinemaName: '',
    cinemaAddress: '',
    cinemaDistance: '',
    cinemaBrand: '',
    cinemaLatitude: 0,
    cinemaLongitude: 0,
    films: [],
    loading: true,
    showEmpty: false
  },

  onLoad: function(options) {
    var that = this
    var cinemaId = options.id || ''
    var cinemaName = options.name ? decodeURIComponent(options.name) : ''
    var cinemaAddress = options.address ? decodeURIComponent(options.address) : ''
    var cinemaDistance = options.distance ? decodeURIComponent(options.distance) : ''
    var cinemaBrand = options.brand ? decodeURIComponent(options.brand) : ''
    var cinemaLatitude = parseFloat(options.latitude) || 0
    var cinemaLongitude = parseFloat(options.longitude) || 0
    
    that.setData({
      cinemaId: cinemaId,
      cinemaName: cinemaName || '影院',
      cinemaAddress: cinemaAddress,
      cinemaDistance: cinemaDistance,
      cinemaBrand: cinemaBrand,
      cinemaLatitude: cinemaLatitude,
      cinemaLongitude: cinemaLongitude
    })
    
    // 如果没有坐标但有地址，尝试通过地址获取坐标
    if ((!cinemaLatitude || !cinemaLongitude) && cinemaAddress) {
      that.getLocationFromAddress(cinemaAddress)
    }
    
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: cinemaName || '影院详情'
    })
    
    // 加载正在上映的电影列表
    that.loadFilms()
  },

  // 加载正在上映的电影列表
  loadFilms: function() {
    var that = this
    that.setData({
      loading: true,
      showEmpty: false,
      films: [],
      hasMore: true,
      showLoading: true,
      start: 0
    })
    
    // 使用热映中的电影列表
    douban.fetchFilms.call(that, config.apiList.popular, 0, null, function(data) {
      if (data && data.subjects && data.subjects.length > 0) {
        // 只取前20部电影
        var films = data.subjects.slice(0, 20)
        that.setData({
          films: films,
          loading: false,
          showEmpty: false
        })
      } else {
        that.setData({
          films: [],
          loading: false,
          showEmpty: true
        })
      }
    }, function() {
      // 失败时使用模拟数据
      that.setData({
        films: that.getMockFilms(),
        loading: false,
        showEmpty: false
      })
    })
  },

  // 获取模拟电影数据
  getMockFilms: function() {
    return [
      {
        id: 'mock1',
        title: '热门电影1',
        images: { large: '/resource/logo.png' },
        rating: { average: 8.5 },
        year: '2024',
        genres: ['剧情', '动作']
      },
      {
        id: 'mock2',
        title: '热门电影2',
        images: { large: '/resource/logo.png' },
        rating: { average: 9.0 },
        year: '2024',
        genres: ['科幻', '冒险']
      },
      {
        id: 'mock3',
        title: '热门电影3',
        images: { large: '/resource/logo.png' },
        rating: { average: 7.8 },
        year: '2024',
        genres: ['喜剧', '爱情']
      }
    ]
  },

  // 查看电影详情
  viewFilmDetail: function(e) {
    var that = this
    var filmId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '../filmDetail/filmDetail?id=' + filmId
    })
  },

  // 直接选座购票
  buyTicket: function(e) {
    var that = this
    var filmId = e.currentTarget.dataset.id
    var filmIndex = e.currentTarget.dataset.index || -1
    var filmTitle = e.currentTarget.dataset.title
    var cinemaId = that.data.cinemaId
    var cinemaName = that.data.cinemaName
    
    // 获取电影信息（包括评分）
    var film = null
    if (filmIndex >= 0 && that.data.films[filmIndex]) {
      film = that.data.films[filmIndex]
    } else {
      film = that.data.films.find(function(item) {
        return item.id == filmId
      })
    }
    
    var filmRating = film && film.rating ? film.rating.average : 0
    
    wx.navigateTo({
      url: '../scheduleSelect/scheduleSelect?filmId=' + filmId + 
           '&filmTitle=' + encodeURIComponent(filmTitle) + 
           '&cinemaId=' + cinemaId + 
           '&cinemaName=' + encodeURIComponent(cinemaName) +
           '&cinemaBrand=' + encodeURIComponent(that.data.cinemaBrand) +
           '&filmRating=' + filmRating
    })
  },

  // 通过地址获取坐标（使用高德地图地理编码API）
  getLocationFromAddress: function(address) {
    var that = this
    var config = require('../../comm/script/config')
    
    if (!config.amapKey || !address) {
      return
    }
    
    wx.request({
      url: 'https://restapi.amap.com/v3/geocode/geo',
      data: {
        key: config.amapKey,
        address: address
      },
      method: 'GET',
      success: function(res) {
        if (res.data && res.data.status === '1' && res.data.geocodes && res.data.geocodes.length > 0) {
          var location = res.data.geocodes[0].location
          if (location) {
            var locationParts = location.split(',')
            var longitude = parseFloat(locationParts[0])
            var latitude = parseFloat(locationParts[1])
            that.setData({
              cinemaLongitude: longitude,
              cinemaLatitude: latitude
            })
          }
        }
      },
      fail: function(err) {
        console.error('获取坐标失败', err)
      }
    })
  },

  // 打开系统地图导航
  openLocation: function() {
    var that = this
    var latitude = that.data.cinemaLatitude
    var longitude = that.data.cinemaLongitude
    var cinemaName = that.data.cinemaName
    var cinemaAddress = that.data.cinemaAddress
    
    // 如果还没有坐标，尝试通过地址获取
    if ((!latitude || !longitude) && cinemaAddress) {
      that.getLocationFromAddress(cinemaAddress)
      // 提示用户稍后再试
      wx.showToast({
        title: '正在获取位置信息...',
        icon: 'loading',
        duration: 1500
      })
      return
    }
    
    // 如果还是没有坐标，提示用户
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
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    var that = this
    that.loadFilms()
    setTimeout(function() {
      wx.stopPullDownRefresh()
    }, 1000)
  }
})

