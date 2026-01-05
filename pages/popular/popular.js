var douban = require('../../comm/script/fetch')
var config = require('../../comm/script/config')
var app = getApp()
Page({
	data: {
		films: [],
		hasMore: true,
		showLoading: true,
		start: 0,
		bannerList: []  // 从电影列表中动态获取
	},
	onLoad: function() {
		var that = this
		wx.showNavigationBarLoading()
		
		// 先设置默认标题
		wx.setNavigationBarTitle({
			title: '正在热映'
		})
		
		// 尝试获取城市信息（异步，不阻塞数据加载）
		app.getCity(
			function(city){
				// 定位成功，更新标题
				if (city && city.trim() !== '') {
					wx.setNavigationBarTitle({
						title: '正在热映 - ' + city
					})
				}
			},
			function(){
				// 定位失败，保持默认标题
				console.log('城市定位失败，使用默认标题')
			}
		)
		
		// 不等待城市定位，直接加载数据（TMDB不需要城市参数）
		// 这样可以避免因为定位失败导致页面一直加载
		wx.hideNavigationBarLoading()
		douban.fetchFilms.call(that, config.apiList.popular, that.data.start, null, function(data) {
			// 数据加载成功后，从电影列表中取前5个作为轮播图
			if (data && data.subjects && data.subjects.length > 0) {
				var bannerList = data.subjects.slice(0, 5).map(function(film) {
					return {
						type: 'film',
						id: film.id,
						imgUrl: film.images.backdrop || film.images.large || film.images.medium || ''
					}
				}).filter(function(banner) {
					// 过滤掉没有图片的项
					return banner.imgUrl !== ''
				})
				if (bannerList.length > 0) {
					that.setData({
						bannerList: bannerList
					})
				}
			}
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
		this.onLoad()
	},
	onReachBottom: function() {
		var that = this
		if (!that.data.showLoading) {
			douban.fetchFilms.call(that, config.apiList.popular, that.data.start)
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
	viewBannerDetail: function(e) {
		var data = e.currentTarget.dataset
		if (data.type == 'film') {
			wx.navigateTo({
				url: "../filmDetail/filmDetail?id=" + data.id
			})
		} else if (data.type == 'person') {
			wx.navigateTo({
				url: '../personDetail/personDetail?id=' + data.id
			})
		} else if (data.type == 'search') {
			// stype(searchType) 0:关键词, 1:类型标签
			var searchUrl = stype == 'keyword' ? config.search.byKeyword : config.search.byTag
			wx.navigateTo({
				url: '../searchResult/searchResult?url=' + encodeURIComponent(searchUrl) + '&keyword=' + keyword
			})
		}
	},
	viewSearch: function() {
		wx.navigateTo({
			url: '../search/search'
		})
	},
	onBannerImageError: function(e) {
		// 轮播图加载失败时的处理
		console.warn('轮播图加载失败:', e)
	}
})