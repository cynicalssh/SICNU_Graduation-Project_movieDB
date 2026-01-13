var filmNullTip = {
      tipText: '亲，找不到想看的电影',
      actionText: '去逛逛',
      routeUrl: '../../pages/popular/popular'
    }
Page({
  data:{
    film_wish: [],
    nullTip: filmNullTip
  },
  onLoad:function(options){
    var that = this
    that.loadWishList()
  },
  loadWishList: function() {
    var that = this
    wx.getStorage({
      key: 'film_wish',
      success: function(res){
        that.setData({
          film_wish: res.data || []
        })
      },
      fail: function() {
        that.setData({
          film_wish: []
        })
      }
    })
    wx.stopPullDownRefresh()
  },
  onShow: function() {
    // 页面显示时刷新数据
    this.loadWishList()
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

