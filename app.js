var config = require('comm/script/config')
App({
  globalData: {
    userInfo: null
  },
  onLaunch: function() {
    // 获取用户信息
    this.getUserInfo()
    //初始化缓存
    this.initStorage()
  },
  getUserInfo:function(cb){
    var that = this
    // 先检查是否已有用户信息
    if (that.globalData.userInfo) {
      typeof cb == "function" && cb(that.globalData.userInfo)
      return
    }
    
    // 尝试使用新版API获取用户信息（需要用户授权）
    if (wx.getUserProfile) {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: function (res) {
          that.globalData.userInfo = res.userInfo
          typeof cb == "function" && cb(that.globalData.userInfo)
        },
        fail: function (err) {
          console.warn('获取用户信息失败:', err)
          // 如果获取失败，使用默认值
          var defaultUserInfo = {
            nickName: '未登录',
            avatarUrl: '/resource/logo.png',
            gender: 0,
            province: '',
            city: ''
          }
          that.globalData.userInfo = defaultUserInfo
          typeof cb == "function" && cb(defaultUserInfo)
        }
      })
    } else {
      // 兼容旧版API
      wx.login({
        success: function () {
          wx.getUserInfo({
            success: function (res) {
              that.globalData.userInfo = res.userInfo
              typeof cb == "function" && cb(that.globalData.userInfo)
            },
            fail: function (err) {
              console.warn('获取用户信息失败:', err)
              // 如果获取失败，使用默认值
              var defaultUserInfo = {
                nickName: '未登录',
                avatarUrl: '/resource/logo.png',
                gender: 0,
                province: '',
                city: ''
              }
              that.globalData.userInfo = defaultUserInfo
              typeof cb == "function" && cb(defaultUserInfo)
            }
          })
        }
      })
    }
  },
  getCity: function(cb, failCb) {
    var that = this
    var retryCount = 0
    var maxRetries = 2
    
    function attemptGetCity() {
      wx.getLocation({
        type: 'gcj02',
        success: function (res) {
          var locationParam = res.latitude + ',' + res.longitude + '1'
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
              if (res.data && res.data.result && res.data.result.addressComponent) {
                config.city = res.data.result.addressComponent.city.slice(0,-1)
                typeof cb == "function" && cb(res.data.result.addressComponent.city.slice(0,-1))
              } else {
                // 数据格式错误，重试或失败
                if (retryCount < maxRetries) {
                  retryCount++
                  setTimeout(attemptGetCity, 1000)
                } else {
                  typeof failCb == "function" && failCb()
                }
              }
            },
            fail: function(res) {
              // 请求失败，重试或失败
              if (retryCount < maxRetries) {
                retryCount++
                setTimeout(attemptGetCity, 1000)
              } else {
                typeof failCb == "function" && failCb()
              }
            }
          })
        },
        fail: function(res) {
          // 定位失败（可能是权限问题），直接调用失败回调
          console.warn('获取位置失败:', res)
          typeof failCb == "function" && failCb()
        }
      })
    }
    
    attemptGetCity()
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