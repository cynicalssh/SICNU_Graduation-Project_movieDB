var douban = require('../../comm/script/fetch')
var util = require('../../util/util')
var config = require('../../comm/script/config')
Page({
    data: {
        filmDetail: {},
        showLoading: true,
		showContent: false,
        reviews: [],
        reviewsLoading: false,
        reviewsPage: 1,
        reviewsHasMore: true,
        reviewsTotal: 0,
        discussions: [],
        discussionsLoading: false,
        discussionsPage: 1,
        discussionsHasMore: true,
        discussionsTotal: 0
    },
    onLoad: function(options) {
        var that = this
        var id = options.id
		douban.fetchFilmDetail.call(that, config.apiList.filmDetail, id, function(data){
			// 加载评论和讨论（传入电影对象以便获取标题）
			that.loadReviews(id)
			that.loadDiscussions(id, data)
			/// 判断是否收藏
			wx.getStorage({
			key: 'film_favorite',
				success: function(res){
					for (var i = 0; i < res.data.length; i++) {
						if (res.data[i].id == data.id) {
							that.setData({
								isFilmFavorite: true
							})
						}
					}
				}
			})
			// 存储浏览历史
			var date = util.getDate()
			var time = util.getTime()
			var film_history = []
			console.log('----进入----')
			wx.getStorage({
				key: 'film_history',
				success: function(res){
					film_history = res.data
					console.log('----获取缓存----')
					console.log(res.data)
					// 当前的数据
					var now_data = {
						time: time,
						data: data
					}
					// 今天的数据，没有时插入
					var sub_data = {
						date: date,
						films: []
					}
					sub_data.films.push(now_data)
					if (film_history.length == 0) { // 判断是否为空
						console.log('----为空插入----')
						film_history.push(sub_data)
					} else if ((film_history[0].date = date)) { //判断第一个是否为今天
						console.log('----今日插入----')
						console.log(film_history[0].films.length)
						for (var i = 0; i < film_history[0].films.length; i++) {
							// 如果存在则删除，添加最新的
							if (film_history[0].films[i].data.id == data.id) {
								film_history[0].films.splice(i,1)
							}
						}
						film_history[0].films.push(now_data)
					} else { // 不为今天(昨天)插入今天的数据
						console.log('----昨日插入今日----')
						film_history.push(sub_data)
					}
					wx.setStorage({
						key: 'film_history',
						data: film_history,
						success: function(res){
							console.log(res)
							console.log('----设置成功----')
						}
					})
					console.log(film_history)
				},
				fail: function(res) {
					console.log('----获取失败----')
					console.log(res)
				}
			})
		})
    },
	viewPersonDetail: function(e) {
		var data = e.currentTarget.dataset;
		wx.redirectTo({
		  url: '../personDetail/personDetail?id=' + data.id
		})
	},
	viewFilmByTag: function(e) {
		var data = e.currentTarget.dataset
		var keyword = data.tag
		wx.redirectTo({
			url: '../searchResult/searchResult?url=' + encodeURIComponent(config.apiList.search.byTag) + '&keyword=' + keyword
		})
	},
	onPullDownRefresh: function() {
		var that = this
		var id = that.data.filmDetail.id
		if (!id) {
			wx.stopPullDownRefresh()
			return
		}
		// 重置评论和讨论状态
		that.setData({
			reviews: [],
			reviewsPage: 1,
			reviewsHasMore: true,
			reviewsTotal: 0,
			discussions: [],
			discussionsPage: 1,
			discussionsHasMore: true,
			discussionsTotal: 0
		})
		// 重新加载电影详情、评论和讨论
		douban.fetchFilmDetail.call(that, config.apiList.filmDetail, id, function(data){
			that.loadReviews(id)
			that.loadDiscussions(id, data)
		})
	},
	favoriteFilm: function() {
		var that = this
		// 判断原来是否收藏，是则删除，否则添加
		wx.getStorage({
			key: 'film_favorite',
			success: function(res){
				var film_favorite = res.data
				if (that.data.isFilmFavorite) {
					// 删除
					for (var i = 0; i < film_favorite.length; i++) {
						if (film_favorite[i].id == that.data.filmDetail.id) {
							film_favorite.splice(i,1)
							that.setData({
								isFilmFavorite: false
							})
						}
					}
					wx.setStorage({
						key: 'film_favorite',
						data: film_favorite,
						success: function(res){
							console.log(res)
							console.log('----设置成功----')
						}
					})
				} else {
					// 添加
					film_favorite.push(that.data.filmDetail)
					wx.setStorage({
						key: 'film_favorite',
						data: film_favorite,
						success: function(res){
							that.setData({
								isFilmFavorite: true
							})
						}
					})
				}
			}
		})
	},
	// 选座购票
	buyTicket: function() {
		var that = this
		var filmId = that.data.filmDetail.id
		var filmTitle = that.data.filmDetail.title
		var filmRating = that.data.filmDetail.rating ? that.data.filmDetail.rating.average : 0
		wx.navigateTo({
			url: '../cinemaSelect/cinemaSelect?filmId=' + filmId + 
			     '&filmTitle=' + encodeURIComponent(filmTitle) +
			     '&filmRating=' + filmRating
		})
	},
	// 加载评论
	loadReviews: function(filmId) {
		var that = this
		if (!that.data.reviewsHasMore || that.data.reviewsLoading) {
			return
		}
		that.setData({
			reviewsLoading: true
		})
		douban.fetchFilmReviews.call(that, config.apiList.filmReviews, filmId, that.data.reviewsPage, function(data){
			var currentReviews = that.data.reviews || []
			that.setData({
				reviews: currentReviews.concat(data.reviews),
				reviewsPage: that.data.reviewsPage + 1,
				reviewsHasMore: data.page < data.total_pages,
				reviewsTotal: data.total,
				reviewsLoading: false
			})
		})
	},
	// 加载更多评论
	loadMoreReviews: function() {
		var filmId = this.data.filmDetail.id
		if (filmId) {
			this.loadReviews(filmId)
		}
	},
	// 加载讨论
	loadDiscussions: function(filmId, filmInfo) {
		var that = this
		console.log('loadDiscussions 被调用，filmId:', filmId, 'filmInfo:', filmInfo)
		
		if (!that.data.discussionsHasMore || that.data.discussionsLoading) {
			console.log('跳过加载讨论：hasMore=', that.data.discussionsHasMore, 'loading=', that.data.discussionsLoading)
			return
		}
		that.setData({
			discussionsLoading: true
		})
		// 传入电影信息对象以便获取标题（包括英文标题）
		var filmData = filmInfo || { 
			id: filmId, 
			title: that.data.filmDetail.title,
			original_title: that.data.filmDetail.original_title || null
		}
		console.log('准备请求讨论，filmData:', filmData)
		
		douban.fetchFilmDiscussions.call(that, config.apiList.filmDiscussions, filmData, that.data.discussionsPage, function(data){
			console.log('讨论数据回调，返回数据:', data)
			var currentDiscussions = that.data.discussions || []
			var newDiscussions = data.discussions || []
			console.log('当前讨论数:', currentDiscussions.length, '新讨论数:', newDiscussions.length)
			
			// 处理新讨论数据，判断是否需要展开功能
			var processedDiscussions = newDiscussions.map(function(discussion) {
				// 判断内容是否超过3行（大约150个字符）
				var needsExpand = discussion.description && discussion.description.length > 150
				// 复制讨论对象并添加展开相关属性
				var processed = {}
				for (var key in discussion) {
					processed[key] = discussion[key]
				}
				processed.isExpanded = false
				processed.needsExpand = needsExpand
				return processed
			})
			
			that.setData({
				discussions: currentDiscussions.concat(processedDiscussions),
				discussionsPage: that.data.discussionsPage + 1,
				discussionsHasMore: data && data.page < data.total_pages,
				discussionsTotal: data ? data.total : 0,
				discussionsLoading: false
			})
			
			console.log('讨论数据已更新，总数:', that.data.discussions.length)
		})
	},
	// 加载更多讨论
	loadMoreDiscussions: function() {
		var that = this
		var filmId = that.data.filmDetail.id
		var filmInfo = that.data.filmDetail
		if (filmId) {
			that.loadDiscussions(filmId, filmInfo)
		}
	},
	// 切换讨论内容展开/收起
	toggleDiscussionExpand: function(e) {
		var that = this
		var index = e.currentTarget.dataset.index
		var discussions = that.data.discussions || []
		var discussion = discussions[index]
		
		if (!discussion) {
			return
		}
		
		var updateKey = 'discussions[' + index + '].isExpanded'
		that.setData({
			[updateKey]: !discussion.isExpanded
		})
	},
	// 切换回复显示/隐藏
	toggleReplies: function(e) {
		var that = this
		var index = e.currentTarget.dataset.index
		var discussions = that.data.discussions || []
		var discussion = discussions[index]
		
		if (!discussion) {
			return
		}
		
		// 如果已经展开，则收起
		if (discussion.showReplies) {
			var updateKey = 'discussions[' + index + '].showReplies'
			that.setData({
				[updateKey]: false
			})
			return
		}
		
		// 如果还没有加载过回复，则加载
		if (!discussion.replies) {
			// 设置加载状态
			var loadingKey = 'discussions[' + index + '].repliesLoading'
			var showKey = 'discussions[' + index + '].showReplies'
			that.setData({
				[loadingKey]: true,
				[showKey]: true
			})
			
			// 加载回复
			that.loadDiscussionReplies(index, discussion)
		} else {
			// 如果已经加载过，直接显示
			var showKey = 'discussions[' + index + '].showReplies'
			that.setData({
				[showKey]: true
			})
		}
	},
	// 加载讨论的回复（只使用Reddit真实数据）
	loadDiscussionReplies: function(index, discussion) {
		var that = this
		console.log('加载讨论回复，index:', index, 'discussion ID:', discussion.id, 'permalink:', discussion.permalink)
		
		// 只从Reddit获取真实回复，如果没有permalink则显示空
		if (discussion.permalink && discussion.permalink.indexOf('reddit.com') !== -1) {
			console.log('从Reddit获取真实回复，permalink:', discussion.permalink)
			douban.fetchDiscussionReplies.call(that, discussion.permalink, function(replies) {
				console.log('Reddit API返回的回复数量:', replies ? replies.length : 0)
				var repliesKey = 'discussions[' + index + '].replies'
				var loadingKey = 'discussions[' + index + '].repliesLoading'
				that.setData({
					[repliesKey]: replies || [],  // 即使为空也使用空数组，不使用模拟数据
					[loadingKey]: false
				})
			})
		} else {
			// 如果没有permalink，显示空回复列表
			console.log('讨论没有permalink，无法获取回复')
			var repliesKey = 'discussions[' + index + '].replies'
			var loadingKey = 'discussions[' + index + '].repliesLoading'
			that.setData({
				[repliesKey]: [],
				[loadingKey]: false
			})
		}
	},
	// 生成模拟回复数据
	generateMockReplies: function(discussion) {
		var replyCount = discussion.replies_count || discussion.comment_count || 0
		if (replyCount === 0) {
			return []
		}
		
		// 生成3-8条模拟回复
		var count = Math.min(Math.max(3, Math.floor(replyCount / 2)), 8)
		var replies = []
		var now = new Date()
		
		// 基于讨论ID生成一个简单的哈希值，用于随机化回复内容
		var discussionHash = 0
		for (var j = 0; j < discussion.id.length; j++) {
			discussionHash = ((discussionHash << 5) - discussionHash) + discussion.id.charCodeAt(j)
			discussionHash = discussionHash & discussionHash
		}
		
		// 更多样化的回复模板，根据讨论主题生成不同回复
		var baseTemplates = [
			'同意楼主的观点，这部电影确实很棒！',
			'我也看了这部电影，感觉结尾部分处理得特别好。',
			'演员的演技确实在线，特别是主角的表现。',
			'剧情紧凑，没有拖沓的地方，值得推荐。',
			'我也有同感，这部电影值得二刷。',
			'细节处理得很好，导演功力深厚。',
			'配乐也很棒，营造了很好的氛围。',
			'画面很美，视觉效果很震撼。',
			'这部电影确实不错，我已经推荐给朋友了。',
			'同意，特别是那个场景，让人印象深刻。',
			'看完之后回味无穷，很多细节值得推敲。',
			'这部电影的节奏把控得很好，不会让人感到无聊。',
			'角色塑造很成功，每个角色都有自己的特点。',
			'视觉效果和音效配合得天衣无缝。',
			'剧情反转很精彩，完全没想到。',
			'这部电影让我想起了很多经典作品，但又有自己的特色。',
			'导演的功力确实深厚，每个镜头都有深意。',
			'演员们的表演都很自然，没有违和感。',
			'这部电影值得多看几遍，每次都有新发现。',
			'强烈推荐给喜欢这类题材的朋友！'
		]
		
		// 根据讨论标题生成特定回复
		var discussionTitle = discussion.name || ''
		var specificReplies = []
		
		if (discussionTitle.indexOf('观后感') !== -1) {
			specificReplies = [
				'我也刚看完，和楼主感受一样！',
				'结尾确实很震撼，让人印象深刻。',
				'这部电影值得推荐给更多人看。'
			]
		} else if (discussionTitle.indexOf('细节') !== -1 || discussionTitle.indexOf('分析') !== -1) {
			specificReplies = [
				'楼主观察得很仔细，我也注意到了这个细节。',
				'这个细节确实很有意思，导演用心了。',
				'还有很多细节值得挖掘，期待更多分析。'
			]
		} else if (discussionTitle.indexOf('配乐') !== -1 || discussionTitle.indexOf('画面') !== -1) {
			specificReplies = [
				'配乐和画面的配合确实很棒！',
				'视觉效果很震撼，音效也很到位。',
				'这部电影的视听效果确实是一流的。'
			]
		} else if (discussionTitle.indexOf('推荐') !== -1) {
			specificReplies = [
				'感谢推荐，已经准备去看了！',
				'确实值得推荐，我也要推荐给朋友。',
				'同感，这部电影值得更多人看到。'
			]
		} else {
			specificReplies = [
				'我也看了这部电影，感觉不错。',
				'同意楼主的观点。',
				'这部电影确实值得一看。'
			]
		}
		
		// 合并所有模板
		var allTemplates = specificReplies.concat(baseTemplates)
		
		// 使用讨论ID的哈希值作为随机种子，确保每条讨论的回复顺序不同
		for (var i = 0; i < count; i++) {
			var daysAgo = Math.floor(Math.random() * 7) + 1
			// 使用哈希值 + 索引来确保不同讨论的回复内容不同
			var templateIndex = Math.abs((discussionHash + i * 7) % allTemplates.length)
			var authorNum = Math.abs((discussionHash + i * 13) % 1000) + 1
			
			replies.push({
				id: 'reply_' + discussion.id + '_' + i,
				author: '用户' + authorNum,
				content: allTemplates[templateIndex],
				created_at: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
				score: Math.abs((discussionHash + i * 17) % 50) + 1
			})
		}
		
		console.log('生成模拟回复，讨论ID:', discussion.id, '回复数量:', replies.length, '第一条回复:', replies[0] ? replies[0].content : '无')
		return replies
	}
})