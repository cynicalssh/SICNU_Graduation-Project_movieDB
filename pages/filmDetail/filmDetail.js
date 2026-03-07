var douban = require('../../comm/script/fetch')
var config = require('../../comm/script/config')
var userDataSync = require('../../util/userDataSync')
var themeUtil = require('../../util/themeUtil')
Page({
    data: {
        darkMode: false,
        filmDetail: {},
        showLoading: true,
		showContent: false,
		isFilmWish: false,
		isFilmWatched: false,
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
		themeUtil.applyPageTheme(that)
		douban.fetchFilmDetail.call(that, config.apiList.filmDetail, id, function(data){
			// 加载评论和讨论（传入电影对象以便获取标题）
			that.loadReviews(id)
			that.loadDiscussions(id, data)
			// 初始化想看/看过状态
			that.initFilmWatchStatus(data)
			// 存储浏览历史
			that.recordFilmHistory(data)
		})
    },
	onShow: function() {
		themeUtil.applyPageTheme(this)
	},
	initFilmWatchStatus: function(filmData) {
		var that = this
		if (!filmData || !filmData.id) {
			return
		}
		wx.getStorage({
			key: 'film_wish',
			success: function(res) {
				var wishList = Array.isArray(res.data) ? res.data : []
				var isWish = wishList.some(function(item) {
					return item && item.id == filmData.id
				})
				that.setData({
					isFilmWish: isWish
				})
			},
			fail: function() {
				that.setData({
					isFilmWish: false
				})
			}
		})
		wx.getStorage({
			key: 'film_watched',
			success: function(res) {
				var watchedList = Array.isArray(res.data) ? res.data : []
				var isWatched = watchedList.some(function(item) {
					return item && item.id == filmData.id
				})
				that.setData({
					isFilmWatched: isWatched
				})
			},
			fail: function() {
				that.setData({
					isFilmWatched: false
				})
			}
		})
	},
	recordFilmHistory: function(filmData) {
		var that = this
		if (!filmData || !filmData.id) {
			return
		}
		var now = new Date()
		var date = now.getFullYear() + '-' +
			('0' + (now.getMonth() + 1)).slice(-2) + '-' +
			('0' + now.getDate()).slice(-2)
		var time = ('0' + now.getHours()).slice(-2) + ':' +
			('0' + now.getMinutes()).slice(-2) + ':' +
			('0' + now.getSeconds()).slice(-2)
		
		wx.getStorage({
			key: 'film_history',
			success: function(res) {
				that.saveFilmHistory(res.data || [], date, time, filmData)
			},
			fail: function() {
				that.saveFilmHistory([], date, time, filmData)
			}
		})
	},
	saveFilmHistory: function(history, date, time, filmData) {
		var filmHistory = Array.isArray(history) ? history : []
		var todayIndex = -1
		for (var i = 0; i < filmHistory.length; i++) {
			if (filmHistory[i] && filmHistory[i].date === date) {
				todayIndex = i
				break
			}
		}

		// 当天记录不存在则创建，存在但不在首位则前置，保证最近日期在前
		if (todayIndex === -1) {
			filmHistory.unshift({
				date: date,
				films: []
			})
		} else if (todayIndex > 0) {
			var todayData = filmHistory.splice(todayIndex, 1)[0]
			filmHistory.unshift(todayData)
		}

		var todayFilms = filmHistory[0].films
		if (!Array.isArray(todayFilms)) {
			todayFilms = []
		}
		// 同一电影去重，最近一次放最前面
		for (var j = todayFilms.length - 1; j >= 0; j--) {
			if (todayFilms[j] && todayFilms[j].data && todayFilms[j].data.id == filmData.id) {
				todayFilms.splice(j, 1)
			}
		}
		todayFilms.unshift({
			time: time,
			data: filmData
		})
		// 控制单日记录上限，防止无限增长
		if (todayFilms.length > 50) {
			todayFilms = todayFilms.slice(0, 50)
		}
		filmHistory[0].films = todayFilms

		wx.setStorage({
			key: 'film_history',
			data: filmHistory,
			success: function() {
				// 同步到服务器（转为扁平列表）
				var historyList = []
				var seen = {}
				filmHistory.forEach(function(dayData) {
					if (!dayData || !Array.isArray(dayData.films)) {
						return
					}
					dayData.films.forEach(function(filmItem) {
						if (filmItem && filmItem.data && filmItem.data.id) {
							var filmId = String(filmItem.data.id)
							if (!seen[filmId]) {
								seen[filmId] = true
								historyList.push(filmItem.data)
							}
						}
					})
				})
				userDataSync.saveUserDataToServer('filmHistory', historyList)
			}
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
			that.initFilmWatchStatus(data)
		})
	},
	toggleWish: function() {
		var that = this
		var currentFilm = that.data.filmDetail
		if (!currentFilm || !currentFilm.id) {
			return
		}
		wx.getStorage({
			key: 'film_wish',
			success: function(res){
				var wishList = Array.isArray(res.data) ? res.data : []
				if (that.data.isFilmWish) {
					// 删除
					var newWishList = wishList.filter(function(item) {
						return !(item && item.id == currentFilm.id)
					})
					wx.setStorage({
						key: 'film_wish',
						data: newWishList,
						success: function(){
							that.setData({
								isFilmWish: false
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
					var exists = wishList.some(function(item) {
						return item && item.id == currentFilm.id
					})
					if (!exists) {
						wishList.push(currentFilm)
					}
					wx.setStorage({
						key: 'film_wish',
						data: wishList,
						success: function(){
							that.setData({
								isFilmWish: true
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
				// 首次创建
				var wishList = [currentFilm]
				wx.setStorage({
					key: 'film_wish',
					data: wishList,
					success: function() {
						that.setData({
							isFilmWish: true
						})
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
	},
	toggleWatched: function() {
		var that = this
		var currentFilm = that.data.filmDetail
		if (!currentFilm || !currentFilm.id) {
			return
		}
		wx.getStorage({
			key: 'film_watched',
			success: function(res){
				var watchedList = Array.isArray(res.data) ? res.data : []
				if (that.data.isFilmWatched) {
					// 删除
					var newWatchedList = watchedList.filter(function(item) {
						return !(item && item.id == currentFilm.id)
					})
					wx.setStorage({
						key: 'film_watched',
						data: newWatchedList,
						success: function(){
							that.setData({
								isFilmWatched: false
							})
							// 同步到服务器
							userDataSync.saveUserDataToServer('filmWatched', newWatchedList)
							wx.showToast({
								title: '已取消看过',
								icon: 'none',
								duration: 1500
							})
						}
					})
				} else {
					// 添加
					var exists = watchedList.some(function(item) {
						return item && item.id == currentFilm.id
					})
					if (!exists) {
						watchedList.push(currentFilm)
					}
					wx.setStorage({
						key: 'film_watched',
						data: watchedList,
						success: function(){
							that.setData({
								isFilmWatched: true
							})
							// 同步到服务器
							userDataSync.saveUserDataToServer('filmWatched', watchedList)
							wx.showToast({
								title: '已添加到看过',
								icon: 'success',
								duration: 1500
							})
						}
					})
				}
			},
			fail: function() {
				// 首次创建
				var watchedList = [currentFilm]
				wx.setStorage({
					key: 'film_watched',
					data: watchedList,
					success: function() {
						that.setData({
							isFilmWatched: true
						})
						userDataSync.saveUserDataToServer('filmWatched', watchedList)
						wx.showToast({
							title: '已添加到看过',
							icon: 'success',
							duration: 1500
						})
					}
				})
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
				processed.translationLoading = false
				processed.showTranslated = false
				processed.originalName = processed.name || ''
				processed.originalDescription = processed.description || ''
				processed.translatedName = ''
				processed.translatedDescription = ''
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
	// 翻译讨论正文（英文 -> 中文）
	toggleDiscussionTranslation: function(e) {
		var that = this
		var index = e.currentTarget.dataset.index
		var discussions = that.data.discussions || []
		var discussion = discussions[index]
		if (!discussion) {
			return
		}
		if (discussion.translationLoading) {
			return
		}
		var basePath = 'discussions[' + index + ']'
		var originalName = discussion.originalName || discussion.name || ''
		var originalDescription = discussion.originalDescription || discussion.description || ''
		// 已展示译文时，点击切回原文
		if (discussion.showTranslated) {
			var originalNeedsExpand = originalDescription && originalDescription.length > 150
			that.setData({
				[basePath + '.name']: originalName,
				[basePath + '.description']: originalDescription,
				[basePath + '.showTranslated']: false,
				[basePath + '.needsExpand']: originalNeedsExpand,
				[basePath + '.isExpanded']: originalNeedsExpand ? discussion.isExpanded : false
			})
			return
		}
		// 已有译文缓存则直接展示（标题+正文一起替换）
		if (discussion.translatedName || discussion.translatedDescription) {
			var cacheTitle = discussion.translatedName || originalName
			var cacheDesc = discussion.translatedDescription || originalDescription
			var cacheNeedsExpand = cacheDesc && cacheDesc.length > 150
			that.setData({
				[basePath + '.name']: cacheTitle,
				[basePath + '.description']: cacheDesc,
				[basePath + '.showTranslated']: true,
				[basePath + '.needsExpand']: cacheNeedsExpand,
				[basePath + '.isExpanded']: cacheNeedsExpand ? discussion.isExpanded : false
			})
			return
		}
		if (!originalName && !originalDescription) {
			wx.showToast({
				title: '暂无可翻译内容',
				icon: 'none'
			})
			return
		}
		that.setData({
			[basePath + '.translationLoading']: true
		})
		that.translateTextToChinese(originalName, function(translatedTitle) {
			that.translateTextToChinese(originalDescription, function(translatedDesc) {
				var displayTitle = translatedTitle || originalName
				var displayDesc = translatedDesc || originalDescription
				var translatedNeedsExpand = displayDesc && displayDesc.length > 150
				that.setData({
					[basePath + '.translationLoading']: false,
					[basePath + '.translatedName']: displayTitle,
					[basePath + '.translatedDescription']: displayDesc,
					[basePath + '.name']: displayTitle,
					[basePath + '.description']: displayDesc,
					[basePath + '.showTranslated']: true,
					[basePath + '.needsExpand']: translatedNeedsExpand,
					[basePath + '.isExpanded']: translatedNeedsExpand ? discussion.isExpanded : false
				})
			}, function() {
				that.setData({
					[basePath + '.translationLoading']: false
				})
				wx.showToast({
					title: '翻译失败',
					icon: 'none'
				})
			})
		}, function() {
			that.setData({
				[basePath + '.translationLoading']: false
			})
			wx.showToast({
				title: '翻译失败',
				icon: 'none'
			})
		})
	},
	decodeHtmlEntities: function(text) {
		var content = String(text || '')
		content = content.replace(/<br\s*\/?>/ig, '\n')
		content = content.replace(/&quot;/g, '"')
		content = content.replace(/&#39;/g, "'")
		content = content.replace(/&amp;/g, '&')
		content = content.replace(/&lt;/g, '<')
		content = content.replace(/&gt;/g, '>')
		content = content.replace(/&nbsp;/g, ' ')
		content = content.replace(/&#(\d+);/g, function(_, code) {
			var n = parseInt(code, 10)
			return isNaN(n) ? '' : String.fromCharCode(n)
		})
		return content
	},
	translateTextToChinese: function(sourceText, successCb, failCb) {
		var that = this
		var text = String(sourceText || '').trim()
		if (!text) {
			typeof successCb === 'function' && successCb('')
			return
		}
		// 公共翻译接口通常有单次长度限制，按片段翻译后拼接
		var segmentSize = 380
		var segments = []
		for (var i = 0; i < text.length; i += segmentSize) {
			segments.push(text.slice(i, i + segmentSize))
		}
		var translatedSegments = []
		var segIndex = 0
		var requestNext = function() {
			if (segIndex >= segments.length) {
				typeof successCb === 'function' && successCb(translatedSegments.join(''))
				return
			}
			var segment = segments[segIndex]
			var requestUrl = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(segment) + '&langpair=en|zh-CN'
			wx.request({
				url: requestUrl,
				method: 'GET',
				timeout: 12000,
				success: function(res) {
					if (res.statusCode !== 200 || !res.data) {
						typeof failCb === 'function' && failCb('翻译服务暂不可用')
						return
					}
					var translated = ''
					if (res.data.responseData && res.data.responseData.translatedText) {
						translated = that.decodeHtmlEntities(res.data.responseData.translatedText)
					} else if (res.data.matches && res.data.matches.length > 0 && res.data.matches[0].translation) {
						translated = that.decodeHtmlEntities(res.data.matches[0].translation)
					}
					if (!translated) {
						typeof failCb === 'function' && failCb('翻译结果为空')
						return
					}
					translatedSegments.push(translated)
					segIndex += 1
					requestNext()
				},
				fail: function(err) {
					var msg = '翻译请求失败'
					if (err && err.errMsg) {
						if (err.errMsg.indexOf('not in domain list') !== -1 || err.errMsg.indexOf('域名') !== -1) {
							msg = '请配置合法域名：api.mymemory.translated.net'
						} else if (err.errMsg.indexOf('timeout') !== -1) {
							msg = '翻译请求超时，请稍后重试'
						}
					}
					typeof failCb === 'function' && failCb(msg)
				}
			})
		}
		requestNext()
	},
	// 翻译某条回复正文（直接替换正文显示）
	toggleReplyTranslation: function(e) {
		var that = this
		var discussionIndex = e.currentTarget.dataset.discussionIndex
		var replyIndex = e.currentTarget.dataset.replyIndex
		if (discussionIndex === undefined || replyIndex === undefined) {
			return
		}
		var discussions = that.data.discussions || []
		var discussion = discussions[discussionIndex]
		if (!discussion || !Array.isArray(discussion.replies)) {
			return
		}
		var reply = discussion.replies[replyIndex]
		if (!reply) {
			return
		}
		if (reply.translationLoading) {
			return
		}
		var basePath = 'discussions[' + discussionIndex + '].replies[' + replyIndex + ']'
		var originalContent = reply.originalContent || reply.content || ''
		if (!originalContent) {
			wx.showToast({
				title: '暂无可翻译内容',
				icon: 'none'
			})
			return
		}
		// 若当前已是译文，则切回原文
		if (reply.showTranslated) {
			that.setData({
				[basePath + '.content']: originalContent,
				[basePath + '.showTranslated']: false,
				[basePath + '.translationError']: ''
			})
			return
		}
		// 已有译文缓存，直接切换显示
		if (reply.translatedContent) {
			that.setData({
				[basePath + '.content']: reply.translatedContent,
				[basePath + '.showTranslated']: true,
				[basePath + '.translationError']: ''
			})
			return
		}
		that.setData({
			[basePath + '.translationLoading']: true,
			[basePath + '.translationError']: '',
			[basePath + '.originalContent']: originalContent
		})
		that.translateTextToChinese(originalContent, function(translatedText) {
			that.setData({
				[basePath + '.translationLoading']: false,
				[basePath + '.translatedContent']: translatedText,
				[basePath + '.content']: translatedText,
				[basePath + '.showTranslated']: true,
				[basePath + '.translationError']: ''
			})
		}, function(errorMsg) {
			that.setData({
				[basePath + '.translationLoading']: false,
				[basePath + '.translationError']: errorMsg || '翻译失败，请稍后重试'
			})
			wx.showToast({
				title: '翻译失败',
				icon: 'none'
			})
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
				var normalizedReplies = (replies || []).map(function(reply) {
					var normalized = {}
					for (var k in reply) {
						normalized[k] = reply[k]
					}
					normalized.originalContent = reply && reply.content ? reply.content : ''
					normalized.translatedContent = ''
					normalized.showTranslated = false
					normalized.translationLoading = false
					normalized.translationError = ''
					return normalized
				})
				that.setData({
					[repliesKey]: normalizedReplies,  // 即使为空也使用空数组，不使用模拟数据
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
