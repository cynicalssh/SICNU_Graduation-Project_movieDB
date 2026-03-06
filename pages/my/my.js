var config = require('../../comm/script/config')
var themeUtil = require('../../util/themeUtil')
var app = getApp();
Page({
  data:{
    gridList: [
      {enName:'favorite', zhName:'收藏'},
      {enName:'history', zhName:'浏览记录'},
      {enName:'wish', zhName:'想看'},
      {enName:'watched', zhName:'看过'},
      {enName:'gallery', zhName:'相册'},
      {enName:'setting', zhName:'设置'}
    ],
    skin: '',
    needAuth: false, // 是否需要授权
    userInfo: {
      nickName: '未登录',
      avatarUrl: '/resource/logo.png',
      gender: 0,
      province: '',
      city: ''
    },
    userSignature: '', // 个人签名
    userId: null, // 用户ID
    currentTab: 'home', // 当前选中的标签
    isWechatAuthed: false, // 是否已微信授权登录
    isLoggingIn: false, // 是否正在登录
    drawerVisible: false, // 侧边抽屉是否打开
    darkMode: false, // 暗黑模式
    backgroundPreviewVisible: false, // 背景预览弹层是否显示
    isSkinGradient: true, // 当前背景是否为渐变
    isChoosingBackground: false, // 是否正在更换背景图
    skipNextSkinReload: false, // 下次onShow是否跳过从缓存覆盖skin
    wishCount: 0, // 想看数量
    watchedCount: 0, // 看过数量
    galleryPictures: [], // 相册照片列表
    recentHistoryFilms: [], // 最近浏览的电影
    historyCount: 0 // 浏览记录总数（按电影去重）
  },
  onLoad:function(cb){
    var that = this
    // 加载主题偏好
    that.loadThemePreference()
    // 更新tabBar选中状态（延迟执行确保tabBar组件已准备好）
    setTimeout(function() {
      var tabBar = that.getTabBar && that.getTabBar()
      if (tabBar) {
        tabBar.setData({
          selected: 2
        })
        console.log('my onLoad: 更新tabBar selected = 2')
      } else {
        console.log('my onLoad: tabBar未找到，延迟重试')
        setTimeout(function() {
          var tabBar2 = that.getTabBar && that.getTabBar()
          if (tabBar2) {
            tabBar2.setData({
              selected: 2
            })
            console.log('my onLoad: 延迟重试成功，更新tabBar selected = 2')
          }
        }, 200)
      }
    }, 100)
    // 加载个人签名
    that.loadUserSignature()
    // 加载统计数据
    that.loadStats()
    // 加载浏览记录摘要
    that.loadRecentHistory()
    // 加载用户ID
    that.loadUserId()
    // 先尝试从缓存读取用户信息
    wx.getStorage({
      key: 'userInfo',
      success: function(res) {
        if (res.data && res.data.avatarUrl && res.data.avatarUrl !== '/resource/logo.png') {
          // 检查是否是临时文件路径，如果是且过期了，重新下载
          var avatarUrl = res.data.avatarUrl
          if (avatarUrl.indexOf('http://tmp/') === 0 || avatarUrl.indexOf('wxfile://') === 0) {
            // 临时文件路径，检查是否需要重新下载
            if (res.data.originalAvatarUrl) {
              // 重新下载头像
              wx.downloadFile({
                url: res.data.originalAvatarUrl,
                success: function(downloadRes) {
                  res.data.avatarUrl = downloadRes.tempFilePath
                  app.globalData.userInfo = res.data
                  that.setData({
                    userInfo: res.data
                  })
                  // 更新缓存
                  wx.setStorage({
                    key: 'userInfo',
                    data: res.data
                  })
                  // 加载位置信息
                  that.loadLocationInfo()
                  typeof cb == 'function' && cb()
                },
                fail: function() {
                  // 下载失败，使用原始URL
                  res.data.avatarUrl = res.data.originalAvatarUrl
                  app.globalData.userInfo = res.data
                  that.setData({
                    userInfo: res.data
                  })
                  // 加载位置信息
                  that.loadLocationInfo()
                  typeof cb == 'function' && cb()
                }
              })
              return
            }
          }
          
          // 缓存中有有效的用户信息，直接使用
          app.globalData.userInfo = res.data
          that.setData({
            userInfo: res.data
          })
          // 加载位置信息
          that.loadLocationInfo()
          typeof cb == 'function' && cb()
          return
        }
      },
      complete: function() {
        // 检测全局数据中是否存在用户信息
        if (app.globalData.userInfo != null && app.globalData.userInfo.avatarUrl && app.globalData.userInfo.avatarUrl !== '/resource/logo.png') {
          that.setData({
              userInfo: app.globalData.userInfo
          })
          // 加载位置信息
          that.loadLocationInfo()
          typeof cb == 'function' && cb()
        } else {
          // 没有用户信息，自动请求授权获取
          that.requestUserInfo()
          // 加载位置信息
          that.loadLocationInfo()
          typeof cb == 'function' && cb()
        }
      }
    })
  },
  // 判断是否为有效微信用户信息
  isValidUserInfo: function(userInfo) {
    if (!userInfo) {
      return false
    }
    var avatarUrl = userInfo.avatarUrl || ''
    var nickName = userInfo.nickName || ''
    if (!avatarUrl || avatarUrl === '/resource/logo.png') {
      return false
    }
    if (!nickName || nickName === '未登录' || nickName === '微信用户') {
      return false
    }
    return true
  },
  // 加载位置信息
  loadLocationInfo: function() {
    var that = this
    // 先检查全局数据中是否有位置信息
    if (app.globalData.userLocation && app.globalData.userLocation.city) {
      var userInfo = that.data.userInfo
      userInfo.city = app.globalData.userLocation.city
      that.setData({
        userInfo: userInfo
      })
      // 更新缓存中的用户信息
      if (app.globalData.userInfo) {
        app.globalData.userInfo.city = app.globalData.userLocation.city
        wx.setStorage({
          key: 'userInfo',
          data: app.globalData.userInfo
        })
      }
      return
    }
    
    // 从缓存读取位置信息
    wx.getStorage({
      key: 'userLocation',
      success: function(res) {
        if (res.data && res.data.city) {
          var userInfo = that.data.userInfo
          userInfo.city = res.data.city
          that.setData({
            userInfo: userInfo
          })
          // 更新全局数据
          app.globalData.userLocation = res.data
          if (app.globalData.userInfo) {
            app.globalData.userInfo.city = res.data.city
            wx.setStorage({
              key: 'userInfo',
              data: app.globalData.userInfo
            })
          }
        } else {
          // 缓存中没有位置信息，尝试获取
          that.requestLocationInfo()
        }
      },
      fail: function() {
        // 缓存中没有位置信息，尝试获取
        that.requestLocationInfo()
      }
    })
  },
  // 请求位置信息
  requestLocationInfo: function() {
    var that = this
    app.getCity(function(city, district) {
      // 获取城市成功（district参数不使用，但会保存到全局数据中）
      var locationInfo = {
        city: city || '',
        district: district || '',
        updateTime: Date.now()
      }
      app.globalData.userLocation = locationInfo
      wx.setStorage({
        key: 'userLocation',
        data: locationInfo
      })
      
      // 更新页面显示
      var userInfo = that.data.userInfo
      userInfo.city = city
      that.setData({
        userInfo: userInfo
      })
      
      // 更新全局用户信息
      if (app.globalData.userInfo) {
        app.globalData.userInfo.city = city
        wx.setStorage({
          key: 'userInfo',
          data: app.globalData.userInfo
        })
      }
      
      console.log('位置信息获取成功:', city, district || '')
    }, function() {
      console.warn('位置信息获取失败')
    })
  },
  // 请求用户信息授权
  requestUserInfo: function() {
    this.setData({
      needAuth: true
    })
  },
  isGradientSkin: function(skinValue) {
    if (!skinValue || typeof skinValue !== 'string') {
      return true
    }
    return skinValue.indexOf('gradient(') !== -1
  },
  applySkin: function(skinValue, needPersist) {
    var nextSkin = skinValue || config.skinList[0].imgUrl
    this.setData({
      skin: nextSkin,
      isSkinGradient: this.isGradientSkin(nextSkin)
    })
    if (needPersist) {
      wx.setStorage({
        key: 'skin',
        data: nextSkin
      })
    }
  },
  loadSkinPreference: function() {
    var that = this
    wx.getStorage({
      key: 'skin',
      success: function(res){
        if (res.data == "") {
          that.applySkin(config.skinList[0].imgUrl, false)
        } else {
          that.applySkin(res.data, false)
        }
      },
      fail: function() {
        that.applySkin(config.skinList[0].imgUrl, false)
      }
    })
  },
  onShow:function(){
    var that = this
    that.loadThemePreference()
    // 更新tabBar选中状态（延迟执行确保tabBar组件已准备好）
    that.updateTabBar(2)
    // 重新加载统计数据
    that.loadStats()
    // 重新加载浏览记录摘要
    that.loadRecentHistory()
    // 如果当前是相册tab，重新加载相册
    if (that.data.currentTab === 'album') {
      that.loadGalleryPictures()
    }
    // 加载背景主题（从裁剪页返回时，避免被旧缓存瞬间覆盖）
    if (that.data.skipNextSkinReload) {
      that.setData({
        skipNextSkinReload: false
      })
    } else {
      that.loadSkinPreference()
    }
    
    // 检查并更新用户信息
    if (app.globalData.userInfo && app.globalData.userInfo.avatarUrl && app.globalData.userInfo.avatarUrl !== '/resource/logo.png') {
      that.setData({
        userInfo: app.globalData.userInfo,
        isWechatAuthed: that.isValidUserInfo(app.globalData.userInfo),
        needAuth: !that.isValidUserInfo(app.globalData.userInfo)
      })
    } else {
      // 如果没有用户信息，标记需要授权
      that.setData({
        needAuth: true,
        isWechatAuthed: false
      })
    }
  },
  loadThemePreference: function() {
    themeUtil.applyPageTheme(this)
  },
  applyThemeToNavigationBar: function(enabled) {
    themeUtil.applyNavigationBar(enabled)
  },
  openBackgroundPreview: function() {
    this.setData({
      backgroundPreviewVisible: true
    })
  },
  closeBackgroundPreview: function() {
    this.setData({
      backgroundPreviewVisible: false
    })
  },
  preventBgPreviewClose: function() {},
  chooseBackgroundImage: function() {
    var that = this
    if (that.data.isChoosingBackground) {
      return
    }
    that.setData({
      isChoosingBackground: true
    })
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        var tempPath = (res.tempFilePaths && res.tempFilePaths.length > 0) ? res.tempFilePaths[0] : ''
        if (!tempPath) {
          return
        }
        that.openBackgroundCrop(tempPath)
      },
      fail: function(err) {
        if (err && err.errMsg && err.errMsg.indexOf('cancel') !== -1) {
          return
        }
        wx.showToast({
          title: '更换背景失败',
          icon: 'none'
        })
      },
      complete: function() {
        that.setData({
          isChoosingBackground: false
        })
      }
    })
  },
  openBackgroundCrop: function(tempPath) {
    var that = this
    wx.navigateTo({
      url: '../backgroundCrop/backgroundCrop?src=' + encodeURIComponent(tempPath),
      events: {
        cropDone: function(payload) {
          var croppedPath = payload && payload.tempFilePath ? payload.tempFilePath : ''
          if (!croppedPath) {
            return
          }
          that.applyBackgroundFromCrop(croppedPath)
        }
      }
    })
  },
  applyBackgroundFromCrop: function(tempPath) {
    var that = this
    that.setData({
      skipNextSkinReload: true,
      backgroundPreviewVisible: false
    })
    wx.saveFile({
      tempFilePath: tempPath,
      success: function(saveRes) {
        that.applySkin(saveRes.savedFilePath, true)
      },
      fail: function() {
        that.applySkin(tempPath, true)
      }
    })
  },
  // 打开侧边栏
  viewMenu: function() {
    this.setData({
      drawerVisible: true
    })
  },
  // 关闭侧边栏
  closeDrawer: function() {
    this.setData({
      drawerVisible: false
    })
  },
  // 阻止抽屉内部点击冒泡，避免误关闭
  preventDrawerClose: function() {},
  handleDrawerAction: function(e) {
    var action = e.currentTarget.dataset.action
    if (!action) {
      return
    }
    this.closeDrawer()
    switch (action) {
      case 'editProfile':
        wx.navigateTo({
          url: '../editPersonInfo/editPersonInfo'
        })
        break
      case 'editNickname':
        this.quickEditNickname()
        break
      case 'editSignature':
        this.editSignature()
        break
      case 'history':
        this.viewHistory()
        break
      case 'wish':
        this.viewWish()
        break
      case 'watched':
        this.viewWatched()
        break
      case 'setting':
        wx.navigateTo({
          url: '../setting/setting'
        })
        break
      case 'about':
        this.viewAbout()
        break
      case 'feedback':
        wx.showToast({
          title: '反馈功能开发中',
          icon: 'none'
        })
        break
      case 'orders':
        wx.showToast({
          title: '订单功能开发中',
          icon: 'none'
        })
        break
      case 'cart':
        wx.showToast({
          title: '购物车功能开发中',
          icon: 'none'
        })
        break
      case 'wallet':
        wx.showToast({
          title: '钱包功能开发中',
          icon: 'none'
        })
        break
      default:
        break
    }
  },
  onDarkModeSwitch: function(e) {
    var enabled = !!e.detail.value
    this.setData({
      darkMode: enabled
    })
    themeUtil.setDarkMode(enabled)
    themeUtil.applyNavigationBar(enabled)
  },
  quickEditNickname: function() {
    var that = this
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称',
      content: (that.data.userInfo && that.data.userInfo.nickName) ? that.data.userInfo.nickName : '',
      success: function(res) {
        if (!res.confirm) {
          return
        }
        var nickName = (res.content || '').trim()
        if (!nickName) {
          wx.showToast({
            title: '昵称不能为空',
            icon: 'none'
          })
          return
        }
        that.updateUserInfoCache({
          nickName: nickName
        })
        that.syncNickNameToPersonInfo(nickName)
        wx.showToast({
          title: '昵称已更新',
          icon: 'success'
        })
      }
    })
  },
  syncNickNameToPersonInfo: function(nickName) {
    var defaultPersonInfo = {
      name: '',
      nickName: '',
      gender: '',
      age: '',
      birthday: '',
      constellation: '',
      company: '',
      school: '',
      tel: '',
      email: '',
      intro: ''
    }
    wx.getStorage({
      key: 'person_info',
      success: function(res) {
        var personInfo = res.data || defaultPersonInfo
        personInfo.nickName = nickName
        wx.setStorage({
          key: 'person_info',
          data: personInfo
        })
      },
      fail: function() {
        defaultPersonInfo.nickName = nickName
        wx.setStorage({
          key: 'person_info',
          data: defaultPersonInfo
        })
      }
    })
  },

  onRouteDone: function() {
    var that = this
    // 路由完成后也更新tabBar
    that.updateTabBar(2)
  },

  // 更新tabBar的通用方法
  updateTabBar: function(index) {
    var that = this
    // 多次尝试更新，确保成功
    var tryUpdate = function(attempt) {
      if (attempt > 5) {
        console.log('updateTabBar: 尝试次数过多，放弃')
        return
      }
      var tabBar = that.getTabBar && that.getTabBar()
      if (tabBar) {
        tabBar.setData({
          selected: index
        })
        console.log('updateTabBar: 成功更新 selected =', index, '尝试次数:', attempt)
      } else {
        console.log('updateTabBar: tabBar未找到，尝试次数:', attempt)
        setTimeout(function() {
          tryUpdate(attempt + 1)
        }, 100 * attempt) // 递增延迟
      }
    }
    tryUpdate(1)
  },

  // 点击头像时触发授权（符合微信规范）
  onAvatarTap: function() {
    // 低版本不支持 chooseAvatar 时，点击头像走登录
    if (!wx.canIUse || !wx.canIUse('button.open-type.chooseAvatar')) {
      this.requestUserProfile()
    }
  },
  // 点击按钮授权登录
  startWechatLogin: function() {
    this.requestUserProfile()
  },
  // 执行微信登录（获取code并建立会话）
  requestUserProfile: function() {
    var that = this
    if (that.data.isLoggingIn) {
      return
    }
    that.setData({
      isLoggingIn: true
    })
    wx.showLoading({
      title: '登录中',
      mask: true
    })
    wx.login({
      success: function(loginRes) {
        var loginCode = loginRes && loginRes.code ? loginRes.code : ''
        that.finishWechatAuthLogin(null, loginCode)
      },
      fail: function(err) {
        wx.hideLoading()
        that.setData({
          isLoggingIn: false
        })
        console.warn('wx.login失败:', err)
        wx.showToast({
          title: '微信登录失败',
          icon: 'none'
        })
      }
    })
  },
  // 微信官方推荐：选择头像
  onChooseAvatar: function(e) {
    var that = this
    var avatarUrl = e && e.detail ? e.detail.avatarUrl : ''
    if (!avatarUrl) {
      return
    }
    // 将临时头像保存为持久文件，避免下次失效
    wx.saveFile({
      tempFilePath: avatarUrl,
      success: function(saveRes) {
        that.updateUserInfoCache({
          avatarUrl: saveRes.savedFilePath,
          originalAvatarUrl: saveRes.savedFilePath
        })
      },
      fail: function() {
        that.updateUserInfoCache({
          avatarUrl: avatarUrl,
          originalAvatarUrl: avatarUrl
        })
      }
    })
  },
  // 微信官方推荐：昵称输入
  onNicknameBlur: function(e) {
    var nickName = e && e.detail ? (e.detail.value || '').trim() : ''
    if (!nickName) {
      return
    }
    this.updateUserInfoCache({
      nickName: nickName
    })
  },
  // 更新用户信息并持久化
  updateUserInfoCache: function(partialInfo) {
    var merged = {}
    var baseInfo = this.data.userInfo || {}
    for (var key in baseInfo) {
      merged[key] = baseInfo[key]
    }
    for (var p in partialInfo) {
      merged[p] = partialInfo[p]
    }
    app.globalData.userInfo = merged
    wx.setStorage({
      key: 'userInfo',
      data: merged
    })
    this.setData({
      userInfo: merged,
      isWechatAuthed: this.isValidUserInfo(merged)
    })
  },
  // 完成微信授权登录
  finishWechatAuthLogin: function(userInfo, loginCode) {
    var that = this
    // 仅建立会话，不依赖 getUserProfile 返回头像昵称
    that.loginWithBackendOrLocal(loginCode, function() {
      wx.hideLoading()
      var currentUserInfo = that.data.userInfo || {
        nickName: '微信用户',
        avatarUrl: '/resource/logo.png',
        gender: 0,
        province: '',
        city: ''
      }
      if (app.globalData.userLocation && app.globalData.userLocation.city) {
        currentUserInfo.city = app.globalData.userLocation.city
      }
      app.globalData.userInfo = currentUserInfo
      wx.setStorage({
        key: 'userInfo',
        data: currentUserInfo
      })
      that.setData({
        needAuth: false,
        userInfo: currentUserInfo,
        isWechatAuthed: that.isValidUserInfo(currentUserInfo),
        isLoggingIn: false
      })
      if (that.data.isWechatAuthed) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: '已登录，请选头像昵称',
          icon: 'none'
        })
      }
    })
  },
  // 优先后端登录，失败则用本地会话兜底
  loginWithBackendOrLocal: function(loginCode, done) {
    var that = this
    if (!loginCode) {
      that.createLocalSession(done)
      return
    }
    wx.request({
      url: config.backendApiUrl + '/auth/wechat/login',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        code: loginCode
      },
      timeout: 5000,
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.token) {
          app.globalData.token = res.data.token
          app.globalData.userId = res.data.userId
          app.globalData.openId = res.data.openId
          wx.setStorage({
            key: 'token',
            data: res.data.token
          })
          wx.setStorage({
            key: 'userId',
            data: res.data.userId
          })
          wx.setStorage({
            key: 'openId',
            data: res.data.openId
          })
          that.setData({
            userId: res.data.userId
          })
          typeof done === 'function' && done()
        } else {
          that.createLocalSession(done)
        }
      },
      fail: function() {
        that.createLocalSession(done)
      }
    })
  },
  // 本地会话兜底（后端不可用时）
  createLocalSession: function(done) {
    var that = this
    var localUserId = Date.now()
    var localToken = 'local_' + localUserId
    var localOpenId = 'local_openid_' + localUserId
    app.globalData.token = localToken
    app.globalData.userId = localUserId
    app.globalData.openId = localOpenId
    wx.setStorage({
      key: 'token',
      data: localToken
    })
    wx.setStorage({
      key: 'userId',
      data: localUserId
    })
    wx.setStorage({
      key: 'openId',
      data: localOpenId
    })
    that.setData({
      userId: localUserId
    })
    typeof done === 'function' && done()
  },
  onPullDownRefresh: function() {
    this.onLoad(function(){
      wx.stopPullDownRefresh()
    })
  },
  viewGridDetail: function(e) {
    var data = e.currentTarget.dataset
		wx.navigateTo({
			url: "../" + data.url + '/' + data.url
		})
  },
  viewSkin: function() {
		wx.navigateTo({
			url: "../skin/skin"
		})
  },
  // 加载个人签名
  loadUserSignature: function() {
    var that = this
    wx.getStorage({
      key: 'userSignature',
      success: function(res) {
        if (res.data) {
          that.setData({
            userSignature: res.data
          })
        }
      }
    })
  },
  // 加载用户ID
  loadUserId: function() {
    var that = this
    if (app.globalData.userId) {
      that.setData({
        userId: app.globalData.userId
      })
    } else {
      wx.getStorage({
        key: 'userId',
        success: function(res) {
          if (res.data) {
            that.setData({
              userId: res.data
            })
          }
        }
      })
    }
  },
  // 加载统计数据
  loadStats: function() {
    var that = this
    // 加载想看数量
    wx.getStorage({
      key: 'film_wish',
      success: function(res) {
        if (res.data && Array.isArray(res.data)) {
          that.setData({
            wishCount: res.data.length
          })
        }
      }
      })
      // 加载看过数量
    wx.getStorage({
      key: 'film_watched',
      success: function(res) {
        if (res.data && Array.isArray(res.data)) {
          that.setData({
            watchedCount: res.data.length
          })
        }
      }
    })
  },
  // 加载最近浏览记录（电影）
  loadRecentHistory: function() {
    var that = this
    wx.getStorage({
      key: 'film_history',
      success: function(res) {
        var historyByDay = res.data
        if (!historyByDay || !Array.isArray(historyByDay)) {
          that.setData({
            recentHistoryFilms: [],
            historyCount: 0
          })
          return
        }
        // 展平并按最近优先去重（同一电影只保留最近一次）
        var flatList = []
        var seen = {}
        for (var i = 0; i < historyByDay.length; i++) {
          var dayData = historyByDay[i]
          if (!dayData || !dayData.films || !Array.isArray(dayData.films)) {
            continue
          }
          for (var j = 0; j < dayData.films.length; j++) {
            var filmItem = dayData.films[j]
            if (!filmItem || !filmItem.data || !filmItem.data.id) {
              continue
            }
            var filmId = String(filmItem.data.id)
            if (!seen[filmId]) {
              seen[filmId] = true
              flatList.push({
                id: filmItem.data.id,
                title: filmItem.data.title || '未命名电影',
                year: filmItem.data.year || '',
                rating: filmItem.data.rating || { average: 0 },
                image: (filmItem.data.images && (filmItem.data.images.medium || filmItem.data.images.large || filmItem.data.images.small)) || '',
                date: dayData.date || '',
                time: filmItem.time || ''
              })
            }
          }
        }

        that.setData({
          recentHistoryFilms: flatList.slice(0, 3),
          historyCount: flatList.length
        })
      },
      fail: function() {
        that.setData({
          recentHistoryFilms: [],
          historyCount: 0
        })
      }
    })
  },
  // 编辑个人签名
  editSignature: function() {
    var that = this
    wx.showModal({
      title: '编辑个人签名',
      editable: true,
      placeholderText: '介绍下自己',
      content: that.data.userSignature || '',
      success: function(res) {
        if (res.confirm) {
          var signature = res.content || ''
          // 限制长度
          if (signature.length > 50) {
            wx.showToast({
              title: '签名不能超过50字',
              icon: 'none'
            })
            return
          }
          that.setData({
            userSignature: signature
          })
          // 保存到缓存
          wx.setStorage({
            key: 'userSignature',
            data: signature
          })
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
        }
      }
    })
  },
  // 切换标签
  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab
    if (!tab) {
      // 点击搜索图标
      wx.navigateTo({
        url: '../search/search'
      })
      return
    }
    this.setData({
      currentTab: tab
    })
    console.log('切换到标签:', tab)
    
    // 根据标签加载不同内容
    if (tab === 'album') {
      // 相册标签，加载相册
      this.loadGalleryPictures()
    }
  },
  // 加载相册照片
  loadGalleryPictures: function() {
    var that = this
    wx.getStorage({
      key: 'gallery',
      success: function(res) {
        if (res.data && Array.isArray(res.data)) {
          that.setData({
            galleryPictures: res.data
          })
        } else {
          that.setData({
            galleryPictures: []
          })
        }
      },
      fail: function() {
        that.setData({
          galleryPictures: []
        })
      }
    })
  },
  // 预览相册图片
  previewGalleryImage: function(e) {
    var index = e.currentTarget.dataset.index
    var that = this
    wx.previewImage({
      current: that.data.galleryPictures[index],
      urls: that.data.galleryPictures
    })
  },
  // 查看关于我
  viewAbout: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },
  // 查看书影音档案
  viewArchive: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },
  // 查看影视档案
  viewFilmArchive: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },
  // 查看浏览记录（全部）
  viewHistory: function() {
    wx.navigateTo({
      url: '../history/history'
    })
  },
  // 查看浏览记录中的电影详情
  viewHistoryFilmDetail: function(e) {
    var filmId = e.currentTarget.dataset.id
    if (!filmId) {
      return
    }
    wx.navigateTo({
      url: '../filmDetail/filmDetail?id=' + filmId
    })
  },
  // 去电影主页继续浏览
  goBrowseMovies: function() {
    wx.switchTab({
      url: '../popular/popular'
    })
  },
  // 查看想看
  viewWish: function() {
    wx.navigateTo({
      url: '../wish/wish'
    })
  },
  // 查看看过
  viewWatched: function() {
    wx.navigateTo({
      url: '../watched/watched'
    })
  },
  // 创建TOP10
  createTop10: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },
  // 查看搜索
  viewSearch: function() {
    wx.navigateTo({
      url: '../search/search'
    })
  },
  onAvatarError: function(e) {
    var that = this
    console.error('头像加载失败:', e)
    console.log('当前头像URL:', that.data.userInfo.avatarUrl)
    
    // 如果当前是临时文件路径（下载的头像），说明可能是临时文件过期了
    // 尝试重新下载或使用原URL
    var currentAvatarUrl = that.data.userInfo.avatarUrl
    if (currentAvatarUrl && (currentAvatarUrl.indexOf('http://tmp/') === 0 || currentAvatarUrl.indexOf('wxfile://') === 0)) {
      // 临时文件路径，可能是过期了，尝试从缓存重新获取原URL
      wx.getStorage({
        key: 'userInfo',
        success: function(res) {
          if (res.data && res.data.originalAvatarUrl) {
            // 重新下载头像
            wx.downloadFile({
              url: res.data.originalAvatarUrl,
              success: function(downloadRes) {
                var updatedUserInfo = that.data.userInfo
                updatedUserInfo.avatarUrl = downloadRes.tempFilePath
                that.setData({
                  userInfo: updatedUserInfo
                })
                // 更新缓存
                res.data.avatarUrl = downloadRes.tempFilePath
                wx.setStorage({
                  key: 'userInfo',
                  data: res.data
                })
                console.log('重新下载头像成功')
              },
              fail: function() {
                // 下载失败，尝试使用原始URL
                if (res.data.originalAvatarUrl) {
                  var updatedUserInfo = that.data.userInfo
                  updatedUserInfo.avatarUrl = res.data.originalAvatarUrl
                  that.setData({
                    userInfo: updatedUserInfo
                  })
                } else {
                  // 没有原URL，使用默认头像
                  that.setData({
                    'userInfo.avatarUrl': '/resource/logo.png'
                  })
                }
              }
            })
          } else if (res.data && res.data.avatarUrl && res.data.avatarUrl.indexOf('http') === 0) {
            // 有原始HTTP URL，重新下载
            wx.downloadFile({
              url: res.data.avatarUrl,
              success: function(downloadRes) {
                var updatedUserInfo = that.data.userInfo
                updatedUserInfo.avatarUrl = downloadRes.tempFilePath
                that.setData({
                  userInfo: updatedUserInfo
                })
                console.log('重新下载头像成功')
              },
              fail: function() {
                that.setData({
                  'userInfo.avatarUrl': '/resource/logo.png'
                })
              }
            })
          } else {
            // 没有原URL，使用默认头像
            that.setData({
              'userInfo.avatarUrl': '/resource/logo.png'
            })
          }
        },
        fail: function() {
          // 缓存读取失败，使用默认头像
          that.setData({
            'userInfo.avatarUrl': '/resource/logo.png'
          })
        }
      })
    } else {
      // 不是临时文件，直接使用默认头像
      that.setData({
        'userInfo.avatarUrl': '/resource/logo.png'
      })
    }
  }
})
