var app = getApp()
var config = require('../../comm/script/config')
var priceUtil = require('../../util/priceUtil')

Page({
  data: {
    filmId: '',
    filmTitle: '',
    currentCity: '',
    currentDistrict: '全城',
    cinemaList: [],
    filteredCinemaList: [],
    loading: false,
    showEmpty: false,
    // 筛选条件
    selectedBrand: '全部',
    selectedPriceRange: '全部',
    sortType: 'distance', // distance: 距离, price: 价格, rating: 评分
    // 筛选选项
    brandOptions: ['全部', 'IMAX', '4DX', '杜比', '巨幕', 'VIP'],
    priceRangeOptions: ['全部', '35元以下', '35-50元', '50-70元', '70元以上'],
    sortOptions: [
      { label: '距离', value: 'distance' },
      { label: '价格', value: 'price' },
      { label: '评分', value: 'rating' }
    ],
    // UI状态
    showFilterPanel: false,
    showBrandFilter: false,
    showPriceFilter: false,
    showSortOptions: false
  },

  onLoad: function(options) {
    var that = this
    var filmId = options.filmId || ''
    var filmTitle = options.filmTitle || ''
    
    that.setData({
      filmId: filmId,
      filmTitle: decodeURIComponent(filmTitle)
    })
    
    // 加载当前城市信息
    that.loadCurrentCity()
    // 加载影院列表
    that.loadCinemaList()
  },

  // 加载当前城市和区域
  loadCurrentCity: function() {
    var that = this
    var currentCity = ''
    var currentDistrict = '全城'
    
    // 从全局数据获取
    if (app.globalData.userLocation) {
      currentCity = app.globalData.userLocation.city || ''
      currentDistrict = app.globalData.userLocation.district || '全城'
    } else {
      // 从缓存读取
      wx.getStorage({
        key: 'userLocation',
        success: function(res) {
          if (res.data) {
            currentCity = res.data.city || ''
            currentDistrict = res.data.district || '全城'
            app.globalData.userLocation = res.data
          }
        },
        complete: function() {
          that.setData({
            currentCity: currentCity || '定位中',
            currentDistrict: currentDistrict || '全城'
          })
        }
      })
    }
    
    if (currentCity) {
      that.setData({
        currentCity: currentCity,
        currentDistrict: currentDistrict || '全城'
      })
    }
  },

  // 加载影院列表
  loadCinemaList: function() {
    var that = this
    that.setData({
      loading: true,
      showEmpty: false
    })

    // 检查是否有高德地图Key
    if (!config.amapKey || config.amapKey === '') {
      console.error('高德地图Key未配置')
      // 使用模拟数据
      var mockList = that.getMockCinemaList()
      that.setData({
        cinemaList: mockList
      })
      that.applyFilters()
      return
    }

    // 获取用户位置
    var latitude = null
    var longitude = null
    
    if (app.globalData.userLocation) {
      latitude = app.globalData.userLocation.latitude
      longitude = app.globalData.userLocation.longitude
    }
    
    // 如果没有位置信息，使用城市文本搜索
    if (!latitude || !longitude) {
      if (that.data.currentCity && that.data.currentCity !== '定位中' && that.data.currentCity !== '定位失败') {
        that.searchCinemasByCity(function(cinemaList) {
          that.setData({
            cinemaList: cinemaList || that.getMockCinemaList()
          })
          that.applyFilters()
        })
      } else {
        // 使用模拟数据
        var mockList = that.getMockCinemaList()
        that.setData({
          cinemaList: mockList
        })
        that.applyFilters()
      }
    } else {
      // 有位置信息，直接搜索影院
      that.searchCinemas(latitude, longitude)
    }
  },

  // 搜索影院（调用高德地图API）
  searchCinemas: function(latitude, longitude) {
    var that = this
    var locationParam = longitude + ',' + latitude
    
    wx.request({
      url: config.apiList.amapPlaceAround,
      data: {
        key: config.amapKey,
        location: locationParam,
        radius: 10000,
        keywords: '电影院|影院|影城',
        offset: 20,
        page: 1,
        extensions: 'all'
      },
      method: 'GET',
      success: function(res) {
        if (res.data && res.data.status === '1' && res.data.pois && res.data.pois.length > 0) {
          var cinemaList = that.convertPoiListToCinemaList(res.data.pois)
          that.setData({
            cinemaList: cinemaList
          })
          that.applyFilters()
        } else {
          var mockList = that.getMockCinemaList()
          that.setData({
            cinemaList: mockList
          })
          that.applyFilters()
        }
      },
      fail: function() {
        var mockList = that.getMockCinemaList()
        that.setData({
          cinemaList: mockList
        })
        that.applyFilters()
      }
    })
  },

  // 按城市搜索影院
  searchCinemasByCity: function(callback) {
    var that = this
    var city = that.data.currentCity || ''
    
    if (!city || city === '定位中' || city === '定位失败') {
      typeof callback == "function" && callback([])
      return
    }
    
    wx.request({
      url: 'https://restapi.amap.com/v3/place/text',
      data: {
        key: config.amapKey,
        keywords: '电影院',
        city: city,
        offset: 20,
        page: 1,
        extensions: 'all'
      },
      method: 'GET',
      success: function(res) {
        if (res.data && res.data.status === '1' && res.data.pois && res.data.pois.length > 0) {
          var cinemaList = that.convertPoiListToCinemaList(res.data.pois)
          typeof callback == "function" && callback(cinemaList)
        } else {
          var mockList = that.getMockCinemaList()
          typeof callback == "function" && callback(mockList)
        }
      },
      fail: function() {
        typeof callback == "function" && callback([])
      }
    })
  },

  // 转换POI列表为影院列表
  convertPoiListToCinemaList: function(pois) {
    var that = this
    var userLat = app.globalData.userLocation ? app.globalData.userLocation.latitude : null
    var userLng = app.globalData.userLocation ? app.globalData.userLocation.longitude : null
    
    return pois.map(function(poi) {
      var distance = 0
      var distanceText = ''
      
      if (poi.distance) {
        distance = parseInt(poi.distance)
      } else if (userLat && userLng && poi.location) {
        var poiLocation = poi.location.split(',')
        var poiLng = parseFloat(poiLocation[0])
        var poiLat = parseFloat(poiLocation[1])
        var R = 6371000
        var dLat = (poiLat - userLat) * Math.PI / 180
        var dLng = (poiLng - userLng) * Math.PI / 180
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(userLat * Math.PI / 180) * Math.cos(poiLat * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2)
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        distance = R * c
      }
      
      if (distance > 0) {
        if (distance < 1000) {
          distanceText = distance + 'm'
        } else {
          distanceText = (distance / 1000).toFixed(1) + 'km'
        }
      }
      
      var address = poi.address || ''
      if (!address) {
        var addressParts = []
        if (poi.pname) addressParts.push(poi.pname)
        if (poi.cityname) addressParts.push(poi.cityname)
        if (poi.adname) addressParts.push(poi.adname)
        address = addressParts.join('')
      }
      
      // 模拟评分和品牌
      var rating = (Math.random() * 2 + 8).toFixed(1) // 8.0-10.0
      
      // 根据影院名称推断品牌（更真实）
      var brand = 'default'
      var cinemaName = poi.name || ''
      if (cinemaName.indexOf('IMAX') !== -1 || cinemaName.indexOf('imax') !== -1) {
        brand = 'IMAX'
      } else if (cinemaName.indexOf('4DX') !== -1 || cinemaName.indexOf('4dx') !== -1) {
        brand = '4DX'
      } else if (cinemaName.indexOf('杜比') !== -1) {
        brand = '杜比'
      } else if (cinemaName.indexOf('巨幕') !== -1) {
        brand = '巨幕'
      } else if (cinemaName.indexOf('VIP') !== -1 || cinemaName.indexOf('vip') !== -1) {
        brand = 'VIP'
      } else {
        // 如果没有匹配，随机分配
        var brands = ['default', '杜比', '巨幕']
        brand = brands[Math.floor(Math.random() * brands.length)]
      }
      
      // 计算最低票价
      var minPrice = priceUtil.getCinemaMinPrice(poi.id, poi.name, brand)
      
      // 提取经纬度
      var latitude = null
      var longitude = null
      if (poi.location) {
        var locationParts = poi.location.split(',')
        longitude = parseFloat(locationParts[0])
        latitude = parseFloat(locationParts[1])
      } else if (userLat && userLng) {
        // 如果没有位置信息，使用用户位置作为备选
        latitude = userLat
        longitude = userLng
      }
      
      return {
        id: poi.id,
        name: poi.name,
        address: address,
        distance: distanceText,
        distanceValue: distance,
        rating: rating,
        brand: brand,
        minPrice: minPrice,
        latitude: latitude,
        longitude: longitude
      }
    })
  },

  // 获取模拟影院列表
  getMockCinemaList: function() {
    var that = this
    var city = that.data.currentCity || '当前城市'
    var priceUtil = require('../../util/priceUtil')
    
    // 模拟坐标（使用城市中心坐标的偏移）
    var baseLat = 32.4  // 广元市大致纬度
    var baseLng = 105.8  // 广元市大致经度
    
    var mockCinemas = [
      { id: 'mock1', name: '万达影城（' + city + '店）', address: city + '市中心商业区', distance: '1.2km', distanceValue: 1200, rating: '9.2', brand: 'IMAX', latitude: baseLat + 0.01, longitude: baseLng + 0.01 },
      { id: 'mock2', name: 'CGV影城（' + city + '店）', address: city + '购物中心', distance: '2.5km', distanceValue: 2500, rating: '9.0', brand: '4DX', latitude: baseLat + 0.02, longitude: baseLng + 0.02 },
      { id: 'mock3', name: '大地影院（' + city + '店）', address: city + '商业街', distance: '3.8km', distanceValue: 3800, rating: '8.8', brand: '巨幕', latitude: baseLat - 0.01, longitude: baseLng + 0.01 },
      { id: 'mock4', name: '金逸影城（' + city + '店）', address: city + '文化广场', distance: '5.2km', distanceValue: 5200, rating: '9.1', brand: '杜比', latitude: baseLat + 0.015, longitude: baseLng - 0.01 },
      { id: 'mock5', name: '中影国际影城（' + city + '店）', address: city + '新区', distance: '6.5km', distanceValue: 6500, rating: '8.9', brand: 'IMAX', latitude: baseLat - 0.02, longitude: baseLng - 0.02 }
    ]
    
    // 为每个影院计算最低票价
    mockCinemas.forEach(function(cinema) {
      cinema.minPrice = priceUtil.getCinemaMinPrice(cinema.id, cinema.name, cinema.brand)
    })
    
    return mockCinemas
  },

  // 选择影院
  selectCinema: function(e) {
    var that = this
    var cinemaId = e.currentTarget.dataset.id
    var cinemaIndex = e.currentTarget.dataset.index || -1
    var filmId = that.data.filmId
    var filmTitle = that.data.filmTitle
    
    // 获取影院信息（包括品牌）
    var cinema = null
    if (cinemaIndex >= 0 && that.data.cinemaList[cinemaIndex]) {
      cinema = that.data.cinemaList[cinemaIndex]
    } else {
      cinema = that.data.cinemaList.find(function(item) {
        return item.id == cinemaId
      })
    }
    
    var cinemaName = cinema ? cinema.name : ''
    var cinemaBrand = cinema ? (cinema.brand || '') : ''
    
    // 获取影院的坐标信息
    var cinema = null
    if (cinemaIndex >= 0 && that.data.cinemaList[cinemaIndex]) {
      cinema = that.data.cinemaList[cinemaIndex]
    } else {
      cinema = that.data.cinemaList.find(function(item) {
        return item.id == cinemaId
      })
    }
    
    var url = '../scheduleSelect/scheduleSelect?filmId=' + filmId + 
              '&filmTitle=' + encodeURIComponent(filmTitle) + 
              '&cinemaId=' + cinemaId + 
              '&cinemaName=' + encodeURIComponent(cinemaName) +
              '&cinemaBrand=' + encodeURIComponent(cinemaBrand)
    
    // 如果有坐标信息，传递过去
    if (cinema && cinema.latitude && cinema.longitude) {
      url += '&latitude=' + cinema.latitude + 
             '&longitude=' + cinema.longitude +
             '&address=' + encodeURIComponent(cinema.address || '')
    }
    
    wx.navigateTo({
      url: url
    })
  },

  // 应用筛选条件
  applyFilters: function() {
    var that = this
    var cinemaList = that.data.cinemaList
    var filtered = cinemaList.filter(function(cinema) {
      // 品牌筛选
      if (that.data.selectedBrand !== '全部' && cinema.brand !== that.data.selectedBrand) {
        return false
      }
      
      // 价格筛选
      if (that.data.selectedPriceRange !== '全部') {
        var price = cinema.minPrice || 0
        switch(that.data.selectedPriceRange) {
          case '35元以下':
            if (price >= 35) return false
            break
          case '35-50元':
            if (price < 35 || price > 50) return false
            break
          case '50-70元':
            if (price < 50 || price > 70) return false
            break
          case '70元以上':
            if (price <= 70) return false
            break
        }
      }
      
      // 区域筛选（如果选择了具体区域）
      if (that.data.currentDistrict && that.data.currentDistrict !== '全城') {
        // 简单匹配地址中包含区域名称
        var address = cinema.address || ''
        if (address.indexOf(that.data.currentDistrict) === -1) {
          return false
        }
      }
      
      return true
    })
    
    // 排序
    filtered.sort(function(a, b) {
      switch(that.data.sortType) {
        case 'distance':
          var distA = parseFloat(a.distanceValue) || 999999
          var distB = parseFloat(b.distanceValue) || 999999
          return distA - distB
        case 'price':
          var priceA = a.minPrice || 999999
          var priceB = b.minPrice || 999999
          return priceA - priceB
        case 'rating':
          var ratingA = parseFloat(a.rating) || 0
          var ratingB = parseFloat(b.rating) || 0
          return ratingB - ratingA
        default:
          return 0
      }
    })
    
    that.setData({
      filteredCinemaList: filtered,
      loading: false,
      showEmpty: filtered.length === 0
    })
  },

  // 选择城市
  selectCity: function() {
    var that = this
    wx.navigateTo({
      url: '/pages/citySelect/citySelect',
      success: function() {
        // 页面返回时会触发onShow
      }
    })
  },

  // 选择区域
  selectDistrict: function() {
    var that = this
    var city = that.data.currentCity
    
    if (!city || city === '定位中' || city === '定位失败') {
      wx.showToast({
        title: '请先选择城市',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    wx.navigateTo({
      url: '/pages/districtSelect/districtSelect?city=' + encodeURIComponent(city) + '&district=' + encodeURIComponent(that.data.currentDistrict),
      success: function() {
        // 页面返回时会触发onShow
      }
    })
  },

  // 选择品牌筛选
  selectBrand: function(e) {
    var brand = e.currentTarget.dataset.brand
    this.setData({
      selectedBrand: brand,
      showBrandFilter: false
    })
    this.applyFilters()
  },

  // 选择价格范围
  selectPriceRange: function(e) {
    var range = e.currentTarget.dataset.range
    this.setData({
      selectedPriceRange: range,
      showPriceFilter: false
    })
    this.applyFilters()
  },

  // 选择排序方式
  selectSort: function(e) {
    var sortType = e.currentTarget.dataset.sort
    this.setData({
      sortType: sortType,
      showSortOptions: false
    })
    this.applyFilters()
  },

  // 切换筛选面板显示
  toggleFilterPanel: function() {
    this.setData({
      showFilterPanel: !this.data.showFilterPanel
    })
  },

  // 显示品牌筛选
  showBrandFilter: function() {
    this.setData({
      showBrandFilter: !this.data.showBrandFilter,
      showPriceFilter: false,
      showSortOptions: false
    })
  },

  // 显示价格筛选
  showPriceFilter: function() {
    this.setData({
      showPriceFilter: !this.data.showPriceFilter,
      showBrandFilter: false,
      showSortOptions: false
    })
  },

  // 显示排序选项
  showSortOptions: function() {
    this.setData({
      showSortOptions: !this.data.showSortOptions,
      showBrandFilter: false,
      showPriceFilter: false
    })
  },

  // 页面显示时刷新
  onShow: function() {
    var that = this
    // 从全局数据或缓存重新加载城市和区域信息
    var savedCity = ''
    var savedDistrict = '全城'
    
    if (app.globalData.userLocation) {
      savedCity = app.globalData.userLocation.city || ''
      savedDistrict = app.globalData.userLocation.district || '全城'
    } else {
      // 从缓存读取
      wx.getStorage({
        key: 'userLocation',
        success: function(res) {
          if (res.data) {
            savedCity = res.data.city || ''
            savedDistrict = res.data.district || '全城'
            app.globalData.userLocation = res.data
          }
        },
        complete: function() {
          // 只有当城市或区域发生变化时才重新加载
          if (savedCity && savedCity !== that.data.currentCity) {
            that.setData({
              currentCity: savedCity,
              currentDistrict: savedDistrict
            })
            that.loadCinemaList()
          } else if (savedDistrict && savedDistrict !== that.data.currentDistrict) {
            // 只更新区域，不重新加载列表（因为筛选会处理）
            that.setData({
              currentDistrict: savedDistrict
            })
            that.applyFilters()  // 只重新筛选，不重新加载
          } else {
            // 没有变化，只更新显示
            that.setData({
              currentCity: savedCity || that.data.currentCity || '定位中',
              currentDistrict: savedDistrict || that.data.currentDistrict || '全城'
            })
          }
        }
      })
      return
    }
    
    // 如果从全局数据获取到信息
    if (savedCity && savedCity !== that.data.currentCity) {
      that.setData({
        currentCity: savedCity,
        currentDistrict: savedDistrict
      })
      that.loadCinemaList()
    } else if (savedDistrict && savedDistrict !== that.data.currentDistrict) {
      // 只更新区域，不重新加载列表
      that.setData({
        currentDistrict: savedDistrict
      })
      that.applyFilters()  // 只重新筛选
    } else {
      // 没有变化，只更新显示
      that.setData({
        currentCity: savedCity || that.data.currentCity || '定位中',
        currentDistrict: savedDistrict || that.data.currentDistrict || '全城'
      })
    }
  },

  // 显示影院地图（直接打开系统地图）
  showCinemaMap: function(e) {
    var that = this
    var cinemaId = e.currentTarget.dataset.id
    var cinemaName = e.currentTarget.dataset.name || ''
    var cinemaAddress = e.currentTarget.dataset.address || ''
    var latitude = parseFloat(e.currentTarget.dataset.latitude)
    var longitude = parseFloat(e.currentTarget.dataset.longitude)
    
    // 如果没有坐标，尝试从列表中获取
    if (!latitude || !longitude) {
      var cinema = that.data.cinemaList.find(function(item) {
        return item.id == cinemaId
      })
      if (cinema) {
        latitude = parseFloat(cinema.latitude)
        longitude = parseFloat(cinema.longitude)
        cinemaName = cinema.name
        cinemaAddress = cinema.address
      }
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
    that.loadCinemaList()
    setTimeout(function() {
      wx.stopPullDownRefresh()
    }, 1000)
  }
})


