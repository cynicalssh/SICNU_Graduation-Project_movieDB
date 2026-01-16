var filmNullTip = {
      tipText: '亲，找不到电影的收藏',
      actionText: '去逛逛',
      routeUrl: '../../pages/popular/popular'
    }
var personNullTip = {
      tipText: '亲，找不到人物的收藏',
      actionText: '去逛逛',
      routeUrl: '../../pages/popular/popular'
    }
var userDataSync = require('../../util/userDataSync')
Page({
  data:{
    film_favorite: [],
    person_favorite: [],
    show: 'film_favorite',
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
        that.loadLocalData()
      },
      function(err) {
        // 如果加载失败，直接使用本地数据
        console.warn('从服务器加载收藏数据失败，使用本地数据:', err)
        that.loadLocalData()
      }
    )
  },
  loadLocalData: function() {
    var that = this
    wx.getStorage({
      key: 'film_favorite',
      success: function(res){
        that.setData({
          film_favorite: res.data || []
        })
      },
      fail: function() {
        that.setData({
          film_favorite: []
        })
      }
    })
    wx.getStorage({
      key: 'person_favorite',
      success: function(res){
        that.setData({
          person_favorite: res.data || []
        })
      },
      fail: function() {
        that.setData({
          person_favorite: []
        })
      }
    })
    wx.stopPullDownRefresh()
  },
  viewFilmDetail: function(e) {
		var data = e.currentTarget.dataset
		wx.redirectTo({
			url: "../filmDetail/filmDetail?id=" + data.id
		})
  },
  viewPersonDetail: function(e) {
		var data = e.currentTarget.dataset
		wx.redirectTo({
			url: "../personDetail/personDetail?id=" + data.id
		})
  },
  changeViewType: function(e) {
    var data = e.currentTarget.dataset
    this.setData({
      show: data.type,
      nullTip: data.type == 'film_favorite' ? filmNullTip : personNullTip
    })
  }
})