var filmNullTip = {
      tipText: '亲，找不到看过的电影',
      actionText: '去逛逛',
      routeUrl: '../../pages/popular/popular'
    }
Page({
  data:{
    film_watched: [],
    nullTip: filmNullTip
  },
  onLoad:function(options){
    var that = this
    that.loadWatchedList()
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
		wx.redirectTo({
			url: "../filmDetail/filmDetail?id=" + data.id
		})
  }
})

