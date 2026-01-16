var filmNullTip = {
      tipText: '亲，找不到电影的浏览记录',
      actionText: '去逛逛',
      routeUrl: '../../pages/popular/popular'
    }
var personNullTip = {
      tipText: '亲，找不到人物的浏览记录',
      actionText: '去逛逛',
      routeUrl: '../../pages/popular/popular'
    }
var userDataSync = require('../../util/userDataSync')
Page({
  data:{
    film_history: [],
    person_history: [],
    show: 'film_history',
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
        console.warn('从服务器加载浏览记录失败，使用本地数据:', err)
        that.loadLocalData()
      }
    )
  },
  loadLocalData: function() {
    var that = this
    // 浏览记录需要特殊处理，因为本地存储的是按日期分组的格式
    wx.getStorage({
      key: 'film_history',
      success: function(res){
        that.setData({
          film_history: res.data || []
        })
      },
      fail: function() {
        that.setData({
          film_history: []
        })
      }
    })
    wx.getStorage({
      key: 'person_history',
      success: function(res){
        that.setData({
          person_history: res.data || []
        })
      },
      fail: function() {
        that.setData({
          person_history: []
        })
      }
    })
    wx.stopPullDownRefresh()
  },
	onPullDownRefresh: function() {
    this.setData({
      film_history: [],
      person_history: []
    })
		this.onLoad()
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
      nullTip: data.type == 'film_history' ? filmNullTip : personNullTip
    })
  }
})