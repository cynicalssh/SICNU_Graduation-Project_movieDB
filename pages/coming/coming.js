var douban = require('../../comm/script/fetch')
var config = require('../../comm/script/config')
Page({
	data: {
		films: [],
		hasMore: true,
		showLoading: true,
		start: 0
	},
	onLoad: function() {
		var that = this
		douban.fetchFilms.call(that, config.apiList.coming, that.data.start, null, function() {
			that.initFilmStatus()
		})
	},
	onPullDownRefresh: function() {
		var that = this
		that.setData({
			films: [],
			hasMore: true,
			showLoading: true,
			start: 0
		})
		douban.fetchFilms.call(that, config.apiList.coming, that.data.start, null, function() {
			that.initFilmStatus()
		})
	},
	onReachBottom: function() {
		var that = this
		if (!that.data.showLoading) {
			douban.fetchFilms.call(that, config.apiList.coming, that.data.start, null, function() {
				that.initFilmStatus()
			})
		}
	},
	viewFilmDetail: function(e) {
		var data = e.currentTarget.dataset;
		wx.navigateTo({
			url: "../filmDetail/filmDetail?id=" + data.id
		})
	},
	viewFilmByTag: function(e) {
		var data = e.currentTarget.dataset
		var keyword = data.tag
		wx.navigateTo({
			url: '../searchResult/searchResult?url=' + encodeURIComponent(config.apiList.search.byTag) + '&keyword=' + keyword
		})
	},
	// 初始化电影的想看状态
	initFilmStatus: function() {
		var that = this
		var films = that.data.films || []
		
		// 获取本地存储的想看列表
		wx.getStorage({
			key: 'film_wish',
			success: function(res) {
				var wishList = res.data || []
				// 更新每个电影的状态
				var updatedFilms = films.map(function(film) {
					var isWish = wishList.some(function(wishFilm) {
						return wishFilm.id == film.id
					})
					film.isWish = isWish
					return film
				})
				that.setData({
					films: updatedFilms
				})
			},
			fail: function() {
				// 如果没有存储，设置为false
				var updatedFilms = films.map(function(film) {
					film.isWish = false
					return film
				})
				that.setData({
					films: updatedFilms
				})
			}
		})
	},
	// 切换想看状态
	toggleWish: function(e) {
		var userDataSync = require('../../util/userDataSync')
		var that = this
		var data = e.currentTarget.dataset
		var filmId = data.id
		var filmIndex = data.index
		var films = that.data.films || []
		var film = films[filmIndex]
		
		if (!film) {
			return
		}
		
		// 获取本地存储的想看列表
		wx.getStorage({
			key: 'film_wish',
			success: function(res) {
				var wishList = res.data || []
				var isWish = wishList.some(function(wishFilm) {
					return wishFilm.id == filmId
				})
				
				if (isWish) {
					// 移除
					var newWishList = wishList.filter(function(wishFilm) {
						return wishFilm.id != filmId
					})
					wx.setStorage({
						key: 'film_wish',
						data: newWishList,
						success: function() {
							// 更新页面状态
							films[filmIndex].isWish = false
							that.setData({
								films: films
							})
							// 同步到服务器
							userDataSync.saveUserDataToServer('filmWish', newWishList)
							wx.showToast({
								title: '已取消想看',
								icon: 'none',
								duration: 1500
							})
						}
					})
				} else {
					// 添加
					wishList.push(film)
					wx.setStorage({
						key: 'film_wish',
						data: wishList,
						success: function() {
							// 更新页面状态
							films[filmIndex].isWish = true
							that.setData({
								films: films
							})
							// 同步到服务器
							userDataSync.saveUserDataToServer('filmWish', wishList)
							wx.showToast({
								title: '已添加到想看',
								icon: 'success',
								duration: 1500
							})
						}
					})
				}
			},
			fail: function() {
				// 如果没有存储，创建新列表
				var wishList = [film]
				wx.setStorage({
					key: 'film_wish',
					data: wishList,
					success: function() {
						films[filmIndex].isWish = true
						that.setData({
							films: films
						})
						// 同步到服务器
						userDataSync.saveUserDataToServer('filmWish', wishList)
						wx.showToast({
							title: '已添加到想看',
							icon: 'success',
							duration: 1500
						})
					}
				})
			}
		})
	}
})