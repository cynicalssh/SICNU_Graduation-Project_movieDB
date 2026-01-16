var config = require('../../comm/script/config')
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
    wishCount: 0, // 想看数量
    watchedCount: 0, // 看过数量
    galleryPictures: [] // 相册照片列表
  },
  onLoad:function(cb){
    var that = this
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
    var that = this
    // 检查是否支持新API
    if (wx.getUserProfile) {
      // 新API：需要用户主动触发，但我们可以通过模拟点击来触发
      // 注意：微信要求必须在用户点击事件中调用，所以这里先设置一个标记
      // 在页面显示时，如果检测到需要授权，会自动触发
      that.setData({
        needAuth: true
      })
    } else {
      // 旧API：尝试直接获取
      wx.login({
        success: function () {
          wx.getUserInfo({
            success: function (res) {
              var userInfo = res.userInfo
              app.globalData.userInfo = userInfo
              // 保存到缓存
              wx.setStorage({
                key: 'userInfo',
                data: userInfo
              })
              that.setData({
                userInfo: userInfo,
                needAuth: false
              })
              console.log('获取用户信息成功:', userInfo)
            },
            fail: function (err) {
              console.warn('获取用户信息失败:', err)
              that.setData({
                needAuth: false
              })
            }
          })
        }
      })
    }
  },
  onShow:function(){
    var that = this
    // 更新tabBar选中状态（延迟执行确保tabBar组件已准备好）
    that.updateTabBar(2)
    // 重新加载统计数据
    that.loadStats()
    // 如果当前是相册tab，重新加载相册
    if (that.data.currentTab === 'album') {
      that.loadGalleryPictures()
    }
    // 加载主题
    wx.getStorage({
      key: 'skin',
      success: function(res){
        if (res.data == "") {
          that.setData({
            skin: config.skinList[0].imgUrl
          })
        } else {
          that.setData({
            skin: res.data
          })
        }
      }
    })
    
    // 检查并更新用户信息
    if (app.globalData.userInfo && app.globalData.userInfo.avatarUrl && app.globalData.userInfo.avatarUrl !== '/resource/logo.png') {
      that.setData({
        userInfo: app.globalData.userInfo
      })
    } else {
      // 如果没有用户信息，标记需要授权，并提示用户点击头像
      that.setData({
        needAuth: true
      })
      // 自动提示用户点击头像来授权（延迟一下，确保页面已渲染）
      setTimeout(function() {
        if (that.data.userInfo.avatarUrl === '/resource/logo.png') {
          wx.showModal({
            title: '完善资料',
            content: '点击头像即可使用微信头像',
            showCancel: false,
            confirmText: '知道了'
          })
        }
      }, 500)
    }
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
    var that = this
    console.log('点击头像，当前头像URL:', that.data.userInfo.avatarUrl)
    
    // 如果已经有真实的头像，询问是否要重新授权
    if (that.data.userInfo.avatarUrl && that.data.userInfo.avatarUrl !== '/resource/logo.png') {
      wx.showModal({
        title: '更换头像',
        content: '是否要重新授权获取微信头像？',
        success: function(res) {
          if (res.confirm) {
            // 用户确认，继续授权流程
            that.requestUserProfile()
          }
        }
      })
      return
    }
    
    // 没有头像或默认头像，直接请求授权
    that.requestUserProfile()
  },
  // 执行用户信息授权请求
  requestUserProfile: function() {
    var that = this
    console.log('开始请求用户信息授权')
    
    // 请求用户信息授权
    if (wx.getUserProfile) {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: function (res) {
          var userInfo = res.userInfo
          console.log('获取到的用户信息:', userInfo)
          console.log('头像URL:', userInfo.avatarUrl)
          
          // 保存原始头像URL（用于后续重新下载）
          var originalAvatarUrl = userInfo.avatarUrl
          
          // 如果是微信头像URL，需要下载到本地临时路径
          if (userInfo.avatarUrl && (userInfo.avatarUrl.indexOf('wx.qlogo.cn') !== -1 || userInfo.avatarUrl.indexOf('thirdwx.qlogo.cn') !== -1)) {
            // 下载微信头像到本地
            wx.downloadFile({
              url: userInfo.avatarUrl,
              success: function(downloadRes) {
                console.log('头像下载成功:', downloadRes.tempFilePath)
                // 保存原始URL和临时路径
                userInfo.avatarUrl = downloadRes.tempFilePath
                userInfo.originalAvatarUrl = originalAvatarUrl // 保存原始URL
                app.globalData.userInfo = userInfo
                // 保存到缓存（包含原始URL）
                wx.setStorage({
                  key: 'userInfo',
                  data: userInfo
                })
                that.setData({
                  userInfo: userInfo,
                  needAuth: false
                })
                wx.showToast({
                  title: '头像更新成功',
                  icon: 'success',
                  duration: 1500
                })
              },
              fail: function(downloadErr) {
                console.error('头像下载失败:', downloadErr)
                // 下载失败，直接使用原URL（需要配置downloadFile域名）
                userInfo.originalAvatarUrl = originalAvatarUrl
                app.globalData.userInfo = userInfo
                wx.setStorage({
                  key: 'userInfo',
                  data: userInfo
                })
                that.setData({
                  userInfo: userInfo,
                  needAuth: false
                })
                wx.showToast({
                  title: '头像更新成功',
                  icon: 'success',
                  duration: 1500
                })
              }
            })
          } else {
            // 非微信头像URL，直接使用
            userInfo.originalAvatarUrl = originalAvatarUrl
            app.globalData.userInfo = userInfo
            // 保存到缓存
            wx.setStorage({
              key: 'userInfo',
              data: userInfo
            })
            that.setData({
              userInfo: userInfo,
              needAuth: false
            })
            console.log('获取用户信息成功:', userInfo)
            wx.showToast({
              title: '头像更新成功',
              icon: 'success',
              duration: 1500
            })
          }
        },
        fail: function (err) {
          console.warn('获取用户信息失败:', err)
          if (err.errMsg.indexOf('cancel') !== -1) {
            wx.showToast({
              title: '已取消授权',
              icon: 'none',
              duration: 1500
            })
          }
        }
      })
    } else {
      // 兼容旧版API
      wx.login({
        success: function () {
          wx.getUserInfo({
            success: function (res) {
              var userInfo = res.userInfo
              console.log('获取到的用户信息（旧版）:', userInfo)
              console.log('头像URL（旧版）:', userInfo.avatarUrl)
              
              // 保存原始头像URL
              var originalAvatarUrl = userInfo.avatarUrl
              
              // 如果是微信头像URL，需要下载到本地临时路径
              if (userInfo.avatarUrl && (userInfo.avatarUrl.indexOf('wx.qlogo.cn') !== -1 || userInfo.avatarUrl.indexOf('thirdwx.qlogo.cn') !== -1)) {
                wx.downloadFile({
                  url: userInfo.avatarUrl,
                  success: function(downloadRes) {
                    console.log('头像下载成功（旧版）:', downloadRes.tempFilePath)
                    userInfo.avatarUrl = downloadRes.tempFilePath
                    userInfo.originalAvatarUrl = originalAvatarUrl
                    app.globalData.userInfo = userInfo
                    wx.setStorage({
                      key: 'userInfo',
                      data: userInfo
                    })
                    that.setData({
                      userInfo: userInfo,
                      needAuth: false
                    })
                  },
                  fail: function(downloadErr) {
                    console.error('头像下载失败（旧版）:', downloadErr)
                    userInfo.originalAvatarUrl = originalAvatarUrl
                    app.globalData.userInfo = userInfo
                    wx.setStorage({
                      key: 'userInfo',
                      data: userInfo
                    })
                    that.setData({
                      userInfo: userInfo,
                      needAuth: false
                    })
                  }
                })
              } else {
                userInfo.originalAvatarUrl = originalAvatarUrl
                app.globalData.userInfo = userInfo
                wx.setStorage({
                  key: 'userInfo',
                  data: userInfo
                })
                that.setData({
                  userInfo: userInfo,
                  needAuth: false
                })
                console.log('获取用户信息成功（旧版）:', userInfo)
              }
            },
            fail: function (err) {
              console.warn('获取用户信息失败（旧版）:', err)
            }
          })
        }
      })
    }
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
  // 查看菜单
  viewMenu: function() {
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