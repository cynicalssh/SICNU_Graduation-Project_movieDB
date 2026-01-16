var filmNullTip = {
      tipText: '亲，找不到看过的电影',
      actionText: '去逛逛',
      routeUrl: '../../pages/popular/popular'
    }
var userDataSync = require('../../util/userDataSync')
Page({
  data:{
    film_watched: [],
    nullTip: filmNullTip
  },
  onLoad:function(options){
    var that = this
    // 先尝试从服务器加载数据
    userDataSync.loadUserDataFromServer(
      function(serverData) {
        // 合并服务器数据到本地
        userDataSync.mergeUserDataFromServer(serverData)
        // 然后从本地存储读取（已合并）
        that.loadWatchedList()
      },
      function(err) {
        // 如果加载失败，直接使用本地数据
        console.warn('从服务器加载看过数据失败，使用本地数据:', err)
        that.loadWatchedList()
      }
    )
  },
  loadWatchedList: function() {
    var that = this
    wx.getStorage({
      key: 'film_watched',
      success: function(res){
        that.setData({
          film_watched: res.data || []
        })
      },
      fail: function() {
        that.setData({
          film_watched: []
        })
      }
    })
    wx.stopPullDownRefresh()
  },
  onShow: function() {
    // 页面显示时刷新数据
    this.loadWatchedList()
  },
  onPullDownRefresh: function() {
    this.onLoad()
  },
  viewFilmDetail: function(e) {
		var data = e.currentTarget.dataset
		wx.navigateTo({
			url: "../filmDetail/filmDetail?id=" + data.id
		})
  },
  onImageError: function(e) {
    // 图片加载失败时使用默认图片
    var index = e.currentTarget.dataset.index
    var film_watched = this.data.film_watched
    if (film_watched[index]) {
      if (film_watched[index].images) {
        film_watched[index].images.large = '/resource/logo.png'
      } else {
        film_watched[index].images = { large: '/resource/logo.png' }
      }
      this.setData({
        film_watched: film_watched
      })
    }
  }
})

