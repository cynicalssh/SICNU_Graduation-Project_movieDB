var douban = require('../../comm/script/fetch')
var config = require('../../comm/script/config')
var app = getApp()
Page({
	data: {
		currentTab: 'popular',  // 'popular'、'coming' 或 'top'
		films: [],
		hasMore: true,
		showLoading: true,
		start: 0,
		bannerList: [],  // 从电影列表中动态获取
		currentCity: ''  // 当前城市
	},
	onLoad: function() {
		var that = this
		wx.showNavigationBarLoading()
		
		// 先设置默认标题
		wx.setNavigationBarTitle({
			title: '正在热映'
		})
		
		// 加载当前城市信息
		that.loadCurrentCity()
		
		// 尝试获取城市信息（异步，不阻塞数据加载）
		app.getCity(
			function(city){
				// 定位成功，更新标题和页面显示
				if (city && city.trim() !== '') {
					that.setData({
						currentCity: city
					})
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
		that.loadFilms('popular')
	},
	
	// 切换Tab
	switchTab: function(e) {
		var tab = e.currentTarget.dataset.tab
		if (tab === this.data.currentTab) {
			return
		}
		
		this.setData({
			currentTab: tab,
			films: [],
			hasMore: true,
			showLoading: true,
			start: 0
			// 不清空轮播图，保持显示
		})
		
		this.loadFilms(tab)
	},
	
	// 加载电影列表
	loadFilms: function(tab) {
		var that = this
		var apiUrl
		var tabTitle
		
		if (tab === 'popular') {
			apiUrl = config.apiList.popular
			tabTitle = '正在热映'
		} else if (tab === 'coming') {
			apiUrl = config.apiList.coming
			tabTitle = '待上映'
		} else if (tab === 'top') {
			apiUrl = config.apiList.top
			tabTitle = '口碑'
		}
		
		// 更新导航栏标题
		if (that.data.currentCity && that.data.currentCity.trim() !== '') {
			wx.setNavigationBarTitle({
				title: tabTitle + ' - ' + that.data.currentCity
			})
		} else {
			wx.setNavigationBarTitle({
				title: tabTitle
			})
		}
		
		wx.showNavigationBarLoading()
		douban.fetchFilms.call(that, apiUrl, that.data.start, null, function(data) {
			wx.hideNavigationBarLoading()
			// 只有热映中Tab才显示轮播图
			if (tab === 'popular' && data && data.subjects && data.subjects.length > 0) {
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
			start: 0,
			bannerList: []
		})
		this.loadFilms(that.data.currentTab)
	},
	onReachBottom: function() {
		var that = this
		if (!that.data.showLoading) {
			var apiUrl
			if (that.data.currentTab === 'popular') {
				apiUrl = config.apiList.popular
			} else if (that.data.currentTab === 'coming') {
				apiUrl = config.apiList.coming
			} else if (that.data.currentTab === 'top') {
				apiUrl = config.apiList.top
			}
			douban.fetchFilms.call(that, apiUrl, that.data.start)
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
	// 加载当前城市
	loadCurrentCity: function() {
		var that = this
		// 先从全局数据获取
		if (app.globalData.userLocation && app.globalData.userLocation.city) {
			that.setData({
				currentCity: app.globalData.userLocation.city
			})
			return
		}
		// 从缓存读取
		wx.getStorage({
			key: 'userLocation',
			success: function(res) {
				if (res.data && res.data.city) {
					that.setData({
						currentCity: res.data.city
					})
				}
			}
		})
	},
	// 跳转到城市选择页面
	viewCitySelect: function() {
		wx.navigateTo({
			url: '../citySelect/citySelect'
		})
	},
	// 页面显示时更新城市（从城市选择页面返回时）
	onShow: function() {
		this.loadCurrentCity()
	},
	onBannerImageError: function(e) {
		// 轮播图加载失败时的处理
		console.warn('轮播图加载失败:', e)
	}
})