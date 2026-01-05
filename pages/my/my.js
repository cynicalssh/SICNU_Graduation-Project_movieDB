var config = require('../../comm/script/config')
var app = getApp();
Page({
  data:{
    gridList: [
      {enName:'favorite', zhName:'收藏'},
      {enName:'history', zhName:'浏览记录'},
      {enName:'gallery', zhName:'相册'},
      {enName:'setting', zhName:'设置'}
    ],
    skin: '',
    userInfo: {
      nickName: '未登录',
      avatarUrl: '/resource/logo.png',
      gender: 0,
      province: '',
      city: ''
    }
  },
  onLoad:function(cb){
    var that = this
    console.log(app.globalData.userInfo)
    // 检测是否存在用户信息
    if (app.globalData.userInfo != null) {
      that.setData({
          userInfo: app.globalData.userInfo
      })
    } else {
      // 获取用户信息
      app.getUserInfo(function(userInfo) {
        if (userInfo) {
          that.setData({
            userInfo: userInfo
          })
        } else {
          // 如果获取失败，设置默认值
          that.setData({
            userInfo: {
              nickName: '未登录',
              avatarUrl: '/resource/logo.png', // 使用本地默认头像
              gender: 0,
              province: '',
              city: ''
            }
          })
        }
      })
    }
    typeof cb == 'function' && cb()
  },
  onShow:function(){
    var that = this
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
  onAvatarError: function(e) {
    // 头像加载失败时使用默认头像
    this.setData({
      'userInfo.avatarUrl': '/resource/logo.png'
    })
  }
})