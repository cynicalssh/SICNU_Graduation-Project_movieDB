var douban = require('../../comm/script/fetch')
var config = require('../../comm/script/config')
var app = getApp()
Page({
	data: {
		currentTab: 'popular',  // 'popular'、'coming' 或 'top'
		swiperCurrent: 0,  // swiper当前索引 0:热映中, 1:待上映, 2:口碑
		// 热映中数据
		popularFilms: [],
		popularHasMore: true,
		popularShowLoading: true,
		popularStart: 0,
		// 待上映数据
		comingFilms: [],
		comingHasMore: true,
		comingShowLoading: false,
		comingStart: 0,
		// 口碑数据
		topFilms: [],
		topHasMore: true,
		topShowLoading: false,
		topStart: 0,
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
			function(city, district){
				// 定位成功，更新标题和页面显示（district参数不使用，保持兼容）
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
	
	// Swiper切换事件
	onSwiperChange: function(e) {
		var that = this
		var current = e.detail.current
		var tabMap = ['popular', 'coming', 'top']
		var tab = tabMap[current]
		
		that.setData({
			swiperCurrent: current,
			currentTab: tab
		})
		
		// 切换到新tab时，如果数据未加载，则加载数据
		that.loadTabData(tab)
	},
	
	// 切换Tab（点击tab栏）
	switchTab: function(e) {
		var that = this
		var tab = e.currentTarget.dataset.tab
		var index = parseInt(e.currentTarget.dataset.index)
		
		if (index === that.data.swiperCurrent) {
			return
		}
		
		that.setData({
			swiperCurrent: index,
			currentTab: tab
		})
		
		// 切换到新tab时，如果数据未加载，则加载数据
		that.loadTabData(tab)
	},
	
	// 加载Tab数据（如果未加载则加载）
	loadTabData: function(tab) {
		var that = this
		var dataKey = tab + 'Films'
		var loadingKey = tab + 'ShowLoading'
		
		// 如果该tab的数据为空且未在加载中，则加载数据
		if (that.data[dataKey].length === 0 && !that.data[loadingKey]) {
			that.loadFilms(tab)
		}
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
		
		// 设置对应tab的loading状态
		var loadingKey = tab + 'ShowLoading'
		var startKey = tab + 'Start'
		that.setData({
			[loadingKey]: true
		})
		
		wx.showNavigationBarLoading()
		
		// 存储原始的 setData 方法
		var originalSetData = that.setData
		
		// 包装 setData 方法，使其能够更新 tab 对应的数据
		var wrappedSetData = function(obj) {
			var mappedObj = {}
			// 将 films, hasMore, showLoading, start 映射到 tab 对应的数据
			if (obj.films !== undefined) mappedObj[tab + 'Films'] = obj.films
			if (obj.hasMore !== undefined) mappedObj[tab + 'HasMore'] = obj.hasMore
			if (obj.showLoading !== undefined) mappedObj[tab + 'ShowLoading'] = obj.showLoading
			if (obj.start !== undefined) mappedObj[tab + 'Start'] = obj.start
			
			// 调用原始的 setData 更新所有数据
			originalSetData.call(that, { ...obj, ...mappedObj })
		}
		
		// 临时替换 setData 方法，并临时设置数据键以便fetchFilms读取
		that.setData = wrappedSetData
		
		// 临时设置数据键，让fetchFilms能够正确读取
		var tempData = {
			films: that.data[tab + 'Films'] || [],
			hasMore: that.data[tab + 'HasMore'] !== false,
			showLoading: that.data[tab + 'ShowLoading'] || false,
			start: that.data[startKey] || 0
		}
		
		// 临时保存原始数据
		var originalFilms = that.data.films
		var originalHasMore = that.data.hasMore
		var originalShowLoading = that.data.showLoading
		var originalStart = that.data.start
		
		// 临时设置数据
		that.data.films = tempData.films
		that.data.hasMore = tempData.hasMore
		that.data.showLoading = tempData.showLoading
		that.data.start = tempData.start
		
		douban.fetchFilms.call(that, apiUrl, that.data[startKey], null, function(data) {
			wx.hideNavigationBarLoading()
			// 恢复原始的 setData 和数据
			that.setData = originalSetData
			that.data.films = originalFilms
			that.data.hasMore = originalHasMore
			that.data.showLoading = originalShowLoading
			that.data.start = originalStart
			
			// 所有Tab都提取轮播图数据（如果当前没有轮播图数据，则从当前tab数据中提取）
			if (data && data.subjects && data.subjects.length > 0) {
				// 如果当前没有轮播图数据，或者切换到热映中tab，则更新轮播图
				if (!that.data.bannerList || that.data.bannerList.length === 0 || tab === 'popular') {
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
			}
		})
	},
	onPullDownRefresh: function() {
		var that = this
		var tab = that.data.currentTab
		var dataKey = tab + 'Films'
		var hasMoreKey = tab + 'HasMore'
		var loadingKey = tab + 'ShowLoading'
		var startKey = tab + 'Start'
		
		that.setData({
			[dataKey]: [],
			[hasMoreKey]: true,
			[loadingKey]: true,
			[startKey]: 0
		})
		
		// 如果是热映中tab，清空轮播图
		if (tab === 'popular') {
			that.setData({
				bannerList: []
			})
		}
		
		this.loadFilms(tab)
	},
	onReachBottom: function() {
		var that = this
		var tab = that.data.currentTab
		var loadingKey = tab + 'ShowLoading'
		
		if (!that.data[loadingKey]) {
			var apiUrl
			if (tab === 'popular') {
				apiUrl = config.apiList.popular
			} else if (tab === 'coming') {
				apiUrl = config.apiList.coming
			} else if (tab === 'top') {
				apiUrl = config.apiList.top
			}
			
			// 存储原始的 setData 方法
			var originalSetData = that.setData
			
			// 包装 setData 方法
			var wrappedSetData = function(obj) {
				var mappedObj = {}
				if (obj.films !== undefined) mappedObj[tab + 'Films'] = obj.films
				if (obj.hasMore !== undefined) mappedObj[tab + 'HasMore'] = obj.hasMore
				if (obj.showLoading !== undefined) mappedObj[tab + 'ShowLoading'] = obj.showLoading
				if (obj.start !== undefined) mappedObj[tab + 'Start'] = obj.start
				originalSetData.call(that, { ...obj, ...mappedObj })
			}
			
			that.setData = wrappedSetData
			var startKey = tab + 'Start'
			
			// 临时设置数据键，让fetchFilms能够正确读取
			var tempData = {
				films: that.data[tab + 'Films'] || [],
				hasMore: that.data[tab + 'HasMore'] !== false,
				showLoading: that.data[tab + 'ShowLoading'] || false,
				start: that.data[startKey] || 0
			}
			
			// 临时保存原始数据
			var originalFilms = that.data.films
			var originalHasMore = that.data.hasMore
			var originalShowLoading = that.data.showLoading
			var originalStart = that.data.start
			
			// 临时设置数据
			that.data.films = tempData.films
			that.data.hasMore = tempData.hasMore
			that.data.showLoading = tempData.showLoading
			that.data.start = tempData.start
			
			douban.fetchFilms.call(that, apiUrl, that.data[startKey])
			
			// 恢复原始数据
			that.setData = originalSetData
			that.data.films = originalFilms
			that.data.hasMore = originalHasMore
			that.data.showLoading = originalShowLoading
			that.data.start = originalStart
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