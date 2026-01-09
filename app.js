var config = require('comm/script/config')
App({
  globalData: {
    userInfo: null,
    token: null,
    userId: null,
    openId: null,
    userLocation: null  // 用户位置信息 {city: '城市名', updateTime: 时间戳}
  },
  onLaunch: function() {
    // 初始化缓存
    this.initStorage()
    // 自动登录
    this.wechatLogin()
    // 尝试从缓存读取用户信息（不主动请求授权）
    this.loadUserInfoFromCache()
    // 获取位置信息
    this.getLocationInfo()
  },
  // 获取位置信息
  getLocationInfo: function() {
    var that = this
    // 先检查缓存中是否有位置信息
    wx.getStorage({
      key: 'userLocation',
      success: function(res) {
        if (res.data && res.data.city) {
          // 检查缓存是否过期（24小时）
          var cacheAge = Date.now() - (res.data.updateTime || 0)
          var maxCacheAge = 24 * 60 * 60 * 1000 // 24小时
          if (cacheAge < maxCacheAge) {
            that.globalData.userLocation = res.data
            console.log('从缓存加载位置信息:', res.data)
            return // 使用缓存，不再请求新位置
          } else {
            console.log('缓存位置信息已过期，重新获取')
          }
        }
      },
      complete: function() {
        // 获取当前位置（如果缓存不存在或已过期）
        that.getCity(function(city, district) {
          // 获取城市成功，保存到全局数据和缓存
          var locationInfo = {
            city: city || '',
            district: district || '',
            updateTime: Date.now()
          }
          that.globalData.userLocation = locationInfo
          wx.setStorage({
            key: 'userLocation',
            data: locationInfo
          })
          console.log('获取位置信息成功:', locationInfo)
        }, function() {
          console.warn('获取位置信息失败，使用默认值')
          // 即使失败，也设置一个默认值，避免后续重复请求
          var defaultLocation = {
            city: '',
            district: '',
            updateTime: Date.now()
          }
          that.globalData.userLocation = defaultLocation
        })
      }
    })
  },
  // 从缓存加载用户信息
  loadUserInfoFromCache: function() {
    var that = this
    wx.getStorage({
      key: 'userInfo',
      success: function(res) {
        if (res.data && res.data.avatarUrl && res.data.avatarUrl !== '/resource/logo.png') {
          that.globalData.userInfo = res.data
          console.log('从缓存加载用户信息:', res.data)
        }
      }
    })
  },
  // 微信登录
  wechatLogin: function() {
    var that = this
    // 先检查本地是否已有token
    wx.getStorage({
      key: 'token',
      success: function(res) {
        // 如果已有token，直接使用
        that.globalData.token = res.data
        wx.getStorage({
          key: 'userId',
          success: function(res) {
            that.globalData.userId = res.data
          }
        })
        wx.getStorage({
          key: 'openId',
          success: function(res) {
            that.globalData.openId = res.data
          }
        })
        console.log('使用已有token:', that.globalData.token)
      },
      fail: function() {
        // 没有token，调用微信登录获取code
        wx.login({
          success: function(loginRes) {
            if (loginRes.code) {
              // 调用后端登录接口
              wx.request({
                url: config.backendApiUrl + '/auth/wechat/login',
                method: 'POST',
                header: {
                  'Content-Type': 'application/json'
                },
                data: {
                  code: loginRes.code
                },
                success: function(res) {
                  if (res.statusCode === 200 && res.data) {
                    var data = res.data
                    // 保存登录信息
                    that.globalData.token = data.token
                    that.globalData.userId = data.userId
                    that.globalData.openId = data.openId
                    
                    wx.setStorage({
                      key: 'token',
                      data: data.token
                    })
                    wx.setStorage({
                      key: 'userId',
                      data: data.userId
                    })
                    wx.setStorage({
                      key: 'openId',
                      data: data.openId
                    })
                    
                    console.log('登录成功:', data)
                  } else {
                    console.error('登录失败:', res)
                  }
                },
                fail: function(err) {
                  console.error('登录请求失败:', err)
                }
              })
            } else {
              console.error('获取code失败:', loginRes.errMsg)
            }
          },
          fail: function(err) {
            console.error('wx.login失败:', err)
          }
        })
      }
    })
  },
  getUserInfo:function(cb){
    var that = this
    // 先检查缓存中是否有用户信息
    wx.getStorage({
      key: 'userInfo',
      success: function(res) {
        if (res.data && res.data.avatarUrl && res.data.avatarUrl !== '/resource/logo.png') {
          that.globalData.userInfo = res.data
          typeof cb == "function" && cb(res.data)
          return
        }
      },
      complete: function() {
        // 再检查全局数据中是否已有用户信息
        if (that.globalData.userInfo && that.globalData.userInfo.avatarUrl && that.globalData.userInfo.avatarUrl !== '/resource/logo.png') {
          typeof cb == "function" && cb(that.globalData.userInfo)
          return
        }
        
        // 没有用户信息，返回默认值（不主动请求授权，由页面自己处理）
        var defaultUserInfo = {
          nickName: '未登录',
          avatarUrl: '/resource/logo.png',
          gender: 0,
          province: '',
          city: ''
        }
        typeof cb == "function" && cb(defaultUserInfo)
      }
    })
  },
  getCity: function(cb, failCb) {
    var that = this
    console.log('开始获取位置信息')
    wx.getLocation({
      type: 'gcj02',
      success: function (locationRes) {
        console.log('获取GPS位置成功:', locationRes)
        var latitude = locationRes.latitude
        var longitude = locationRes.longitude
        
        // 按顺序尝试：高德地图 -> 腾讯地图 -> 百度地图
        that.getCityFromAmap(latitude, longitude, function(locationData) {
          typeof cb == "function" && cb(locationData.city, locationData.district)
        }, function() {
          // 高德地图失败，尝试腾讯地图
          that.getCityFromTencent(latitude, longitude, function(locationData) {
            typeof cb == "function" && cb(locationData.city, locationData.district)
          }, function() {
            // 腾讯地图失败，尝试百度地图
            that.getCityFromBaidu(latitude, longitude, function(locationData) {
              typeof cb == "function" && cb(locationData.city, locationData.district)
            }, function() {
              // 所有API都失败
              console.error('所有地图API都失败，无法获取城市信息')
              typeof failCb == "function" && failCb()
            })
          })
        })
      },
      fail: function(res) {
        console.error('获取GPS位置失败:', res)
        if (res.errMsg) {
          if (res.errMsg.indexOf('auth deny') !== -1 || res.errMsg.indexOf('authorize') !== -1) {
            console.error('用户拒绝了位置权限')
          } else if (res.errMsg.indexOf('requiredPrivateInfos') !== -1) {
            console.error('需要在app.json中配置requiredPrivateInfos')
          }
        }
        typeof failCb == "function" && failCb()
      }
    })
  },
  // 使用高德地图API获取城市（主要方案）
  getCityFromAmap: function(latitude, longitude, cb, failCb) {
    if (!config.amapKey || config.amapKey === '') {
      console.log('高德地图Key未配置，跳过')
      typeof failCb == "function" && failCb()
      return
    }
    
    var locationParam = longitude + ',' + latitude  // 高德地图格式：经度,纬度
    console.log('调用高德地图API，参数:', locationParam)
    wx.request({
      url: config.apiList.amapGeocode,
      data: {
        key: config.amapKey,
        location: locationParam,
        output: 'json',
        radius: 1000,
        extensions: 'base'
      },
      method: 'GET',
      success: function(res){
        console.log('高德地图API响应:', res.data)
        if (res.data && res.data.status === '1' && res.data.regeocode && res.data.regeocode.addressComponent) {
          var addressComponent = res.data.regeocode.addressComponent
          var city = addressComponent.city || addressComponent.district || addressComponent.adcode || ''
          var district = addressComponent.district || addressComponent.adcode || ''
          
          if (city && city !== '[]') {
            // 移除城市名称末尾的"市"、"区"、"县"等字
            city = city.replace(/[市县区]$/, '')
            config.city = city
            
            // 处理区县信息：移除末尾的"区"、"县"、"市"等字
            if (district && district !== '[]') {
              district = district.replace(/[市县区]$/, '')
            } else {
              district = ''
            }
            
            console.log('成功获取城市和区县（高德地图）:', city, district)
            typeof cb == "function" && cb({city: city, district: district})
            return
          }
        }
        // 处理错误信息
        if (res.data && res.data.infocode) {
          var errorMsg = '高德地图API错误: '
          if (res.data.infocode === '10009') {
            errorMsg += 'USERKEY_PLAT_NOMATCH - Key平台类型不匹配。请检查：1) Key的服务平台是否选择"Web服务"；2) 是否需要在Key设置中添加IP白名单（设置为0.0.0.0/0允许所有IP）'
          } else if (res.data.infocode === '10001') {
            errorMsg += 'INVALID_USER_KEY - Key无效或未配置'
          } else if (res.data.infocode === '10003') {
            errorMsg += 'DAILY_QUERY_OVER_LIMIT - 当日配额已用完'
          } else {
            errorMsg += res.data.info || '未知错误'
          }
          console.error(errorMsg, '错误码:', res.data.infocode)
        } else {
          console.warn('高德地图API返回数据异常:', res.data)
        }
        typeof failCb == "function" && failCb()
      },
      fail: function(err) {
        console.error('高德地图API请求失败:', err)
        typeof failCb == "function" && failCb()
      }
    })
  },
  // 使用腾讯地图API获取城市（备用方案1）
  getCityFromTencent: function(latitude, longitude, cb, failCb) {
    var locationParam = latitude + ',' + longitude
    console.log('调用腾讯地图API（备用方案），参数:', locationParam)
    wx.request({
      url: config.apiList.tencentMap,
      data: {
        location: locationParam,
        key: config.tencentKey,
        get_poi: 0
      },
      method: 'GET',
      success: function(res){
        console.log('腾讯地图API响应（备用方案）:', res.data)
        if (res.data && res.data.status === 0 && res.data.result && res.data.result.address_component) {
          var addressComponent = res.data.result.address_component
          var city = addressComponent.city || addressComponent.district || ''
          var district = addressComponent.district || ''
          
          if (city) {
            city = city.replace(/[市县区]$/, '')
            config.city = city
            
            // 处理区县信息
            if (district) {
              district = district.replace(/[市县区]$/, '')
            } else {
              district = ''
            }
            
            console.log('成功获取城市和区县（腾讯地图）:', city, district)
            typeof cb == "function" && cb({city: city, district: district})
            return
          }
        }
        console.warn('腾讯地图API返回数据异常')
        typeof failCb == "function" && failCb()
      },
      fail: function(err) {
        console.error('腾讯地图API请求失败（备用方案）:', err)
        typeof failCb == "function" && failCb()
      }
    })
  },
  // 使用百度地图API获取城市（备用方案2）
  getCityFromBaidu: function(latitude, longitude, cb, failCb) {
    var locationParam = latitude + ',' + longitude
    console.log('调用百度地图API（备用方案），参数:', locationParam)
    wx.request({
      url: config.apiList.baiduMap,
      data: {
        ak: config.baiduAK,
        location: locationParam,
        output: 'json',
        pois: '1'
      },
      method: 'GET',
      success: function(res){
        console.log('百度地图API响应（备用方案）:', res.data)
        if (res.data && res.data.status === 0 && res.data.result && res.data.result.addressComponent) {
          var addressComponent = res.data.result.addressComponent
          var city = addressComponent.city || ''
          var district = addressComponent.district || ''
          
          if (city) {
            city = city.replace(/市$/, '')
            config.city = city
            
            // 处理区县信息
            if (district) {
              district = district.replace(/[市县区]$/, '')
            } else {
              district = ''
            }
            
            console.log('成功获取城市和区县（百度地图）:', city, district)
            typeof cb == "function" && cb({city: city, district: district})
            return
          }
        }
        console.warn('百度地图API也失败')
        typeof failCb == "function" && failCb()
      },
      fail: function(err) {
        console.error('百度地图API请求失败（备用方案）:', err)
        typeof failCb == "function" && failCb()
      }
    })
  },
  initStorage: function() {
    wx.getStorageInfo({
      success: function(res) {
        // 判断电影收藏是否存在，没有则创建
        if (!('film_favorite' in res.keys)) {
          wx.setStorage({
            key: 'film_favorite',
            data: []
          })
        }
        // 判断人物收藏是否存在，没有则创建
        if (!('person_favorite' in res.keys)) {
          wx.setStorage({
            key: 'person_favorite',
            data: []
          })
        }
        // 判断电影浏览记录是否存在，没有则创建
        if (!('film_history' in res.keys)) {
          wx.setStorage({
            key: 'film_history',
            data: []
          })
        }
        // 判断人物浏览记录是否存在，没有则创建
        if (!('person_history' in res.keys)) {
          wx.setStorage({
            key: 'person_history',
            data: []
          })
        }
        // 个人信息默认数据
        var personInfo = {
          name: '',
          nickName: '',
          gender: '',
          age: '',
          birthday: '',
          constellation: '',
          company: '',
          school: '',
          tel: '',
          email:'',
          intro: ''
        }
        // 判断个人信息是否存在，没有则创建
        if (!('person_info' in res.keys)) {
          wx.setStorage({
            key: 'person_info',
            data: personInfo
          })
        }
        // 判断相册数据是否存在，没有则创建
        if (!('gallery' in res.keys)) {
          wx.setStorage({
            key: 'gallery',
            data: []
          })
        }
        // 判断背景卡选择数据是否存在，没有则创建
        if (!('skin' in res.keys)) {
          wx.setStorage({
            key: 'skin',
            data: ''
          })
        }
      }
    })
  }
})