var config = require('./config.js')
var message = require('../../component/message/message')
var tmdbAdapter = require('../../util/tmdbAdapter')
var genreMap = require('../../util/genreMap')

// 获取电影列表
function fetchFilms(url, start, count, cb, fail_cb) {
  var that = this
  message.hide.call(that)
  if (that.data.hasMore) {
    // TMDB使用page参数，每页20条，计算当前页码
    var page = Math.floor(start / config.count) + 1
    
    // 构建TMDB API请求URL
    var requestUrl = url + '?api_key=' + config.tmdbApiKey + '&language=zh-CN&page=' + page + '&region=CN'
    console.log('请求URL:', requestUrl)
    
    wx.request({
      url: requestUrl,
      method: 'GET', 
      header: {
        "Content-Type": "application/json"
      },
      timeout: 30000,  // 设置30秒超时
      success: function(res){
        console.log('TMDB API响应:', res)
        // 检查响应数据格式
        if (res.statusCode === 200 && res.data && res.data.results) {
          // 转换TMDB数据格式为豆瓣格式
          var convertedData = tmdbAdapter.convertFilmListResponse(res.data)
          
          if(convertedData.subjects.length === 0){
            that.setData({
              hasMore: false,
              showLoading: false
            })
          }else{
            // 确保 films 是一个数组，防止 undefined.concat 错误
            var currentFilms = that.data.films || []
            that.setData({
              films: currentFilms.concat(convertedData.subjects),
              start: (that.data.start || 0) + convertedData.subjects.length,
              showLoading: false
            })
            // 检查是否还有更多数据
            if (res.data.page >= res.data.total_pages) {
              that.setData({
                hasMore: false
              })
            }
            console.log('加载成功，当前start:', that.data.start, '当前页:', res.data.page, '总页数:', res.data.total_pages);
          }
          wx.stopPullDownRefresh()
          typeof cb == 'function' && cb(convertedData)
        } else {
          // 响应格式不正确，可能是API错误
          console.error('TMDB API响应格式错误:', res.data)
          var errorMsg = '数据格式错误'
          
          // 检查是否是API返回的错误信息
          if (res.data && res.data.status_message) {
            errorMsg = 'API错误：' + res.data.status_message
            if (res.data.status_code === 7) {
              errorMsg = 'API Key无效，请检查配置'
            } else if (res.data.status_code === 34) {
              errorMsg = '资源不存在'
            }
          } else if (res.statusCode === 401) {
            errorMsg = 'API Key无效或未授权'
          } else if (res.statusCode === 404) {
            errorMsg = 'API端点不存在'
          }
          
          that.setData({
            showLoading: false
          })
          message.show.call(that,{
            content: errorMsg,
            icon: 'offline',
            duration: 4000
          })
          wx.stopPullDownRefresh()
          typeof fail_cb == 'function' && fail_cb()
        }
      },
      fail: function(err) {
        console.error('请求失败:', err)
        console.error('请求URL:', requestUrl)
        console.error('API Key:', config.tmdbApiKey ? '已配置' : '未配置')
        
        var errorMsg = '网络请求失败'
        if (err.errMsg) {
          if (err.errMsg.indexOf('域名') !== -1 || err.errMsg.indexOf('not in domain list') !== -1) {
            errorMsg = '请在小程序后台配置合法域名：api.themoviedb.org'
          } else if (err.errMsg.indexOf('timeout') !== -1) {
            errorMsg = '请求超时，请检查网络'
          } else {
            errorMsg = '请求失败：' + err.errMsg
          }
        }
        
        that.setData({
            showLoading: false
        })
        message.show.call(that,{
          content: errorMsg,
          icon: 'offline',
          duration: 4000
        })
        wx.stopPullDownRefresh()
        typeof fail_cb == 'function' && fail_cb()
      }
    })
  }
}

// 获取电影详情
function fetchFilmDetail(url, id, cb) {
  var that = this;
  message.hide.call(that)
  // TMDB需要添加append_to_response来获取credits（导演和演员信息）
  var requestUrl = url + id + '?api_key=' + config.tmdbApiKey + '&language=zh-CN&append_to_response=credits'
  console.log('请求电影详情URL:', requestUrl)
  
  wx.request({
    url: requestUrl,
    method: 'GET',
    header: {
      "Content-Type": "application/json"
    },
    timeout: 30000,  // 设置30秒超时
    success: function(res){
      console.log('TMDB电影详情响应:', res)
      if (res.statusCode === 200 && res.data) {
        // 转换TMDB数据格式为豆瓣格式
        var convertedData = tmdbAdapter.convertFilmDetail(res.data)
        
        that.setData({
          filmDetail: convertedData,
          showLoading: false,
          showContent: true
        })
        wx.setNavigationBarTitle({
            title: convertedData.title
        })
        wx.stopPullDownRefresh()
        typeof cb == 'function' && cb(convertedData)
      } else {
        console.error('电影详情数据格式错误:', res.data)
        that.setData({
          showLoading: false
        })
        message.show.call(that,{
          content: '获取电影详情失败',
          icon: 'offline',
          duration: 3000
        })
      }
    },
    fail: function(err) {
      console.error('请求电影详情失败:', err)
      console.error('请求URL:', requestUrl)
      
      var errorMsg = '网络请求失败'
      if (err.errMsg) {
        if (err.errMsg.indexOf('域名') !== -1 || err.errMsg.indexOf('not in domain list') !== -1) {
          errorMsg = '请在小程序后台配置合法域名：api.themoviedb.org'
        } else if (err.errMsg.indexOf('timeout') !== -1) {
          errorMsg = '请求超时，请检查网络'
        } else {
          errorMsg = '请求失败：' + err.errMsg
        }
      }
      
      that.setData({
          showLoading: false
      })
      message.show.call(that,{
        content: errorMsg,
        icon: 'offline',
        duration: 4000
      })
    }
  })
}

// 获取人物详情
function fetchPersonDetail(url, id, cb) {
  var that = this;
  message.hide.call(that)
  var requestUrl = url + id + '?api_key=' + config.tmdbApiKey + '&language=zh-CN'
  console.log('请求人物详情URL:', requestUrl)
  
  wx.request({
    url: requestUrl,
    method: 'GET', 
    header: {
      "Content-Type": "application/json"
    },
    timeout: 30000,  // 设置30秒超时
    success: function(res){
      console.log('TMDB人物详情响应:', res)
      if (res.statusCode === 200 && res.data) {
        // 转换TMDB数据格式为豆瓣格式
        var convertedData = tmdbAdapter.convertPersonDetail(res.data)
        
        that.setData({
          personDetail: convertedData,
          showLoading: false,
          showContent: true
        })
        wx.setNavigationBarTitle({
            title: convertedData.name
        })
        wx.stopPullDownRefresh()
        typeof cb == 'function' && cb(convertedData)
      } else {
        console.error('人物详情数据格式错误:', res.data)
        that.setData({
          showLoading: false
        })
        message.show.call(that,{
          content: '获取人物详情失败',
          icon: 'offline',
          duration: 3000
        })
      }
    },
    fail: function(err) {
      console.error('请求人物详情失败:', err)
      console.error('请求URL:', requestUrl)
      
      var errorMsg = '网络请求失败'
      if (err.errMsg) {
        if (err.errMsg.indexOf('域名') !== -1 || err.errMsg.indexOf('not in domain list') !== -1) {
          errorMsg = '请在小程序后台配置合法域名：api.themoviedb.org'
        } else if (err.errMsg.indexOf('timeout') !== -1) {
          errorMsg = '请求超时，请检查网络'
        } else {
          errorMsg = '请求失败：' + err.errMsg
        }
      }
      
      that.setData({
          showLoading: false
      })
      message.show.call(that,{
        content: errorMsg,
        icon: 'offline',
        duration: 4000
      })
    }
  })
}

// 搜索（关键词或者类型）
function search(url, keyword, start, count, cb){
  var that = this
  message.hide.call(that)
  
  // 判断是关键词搜索还是类型搜索
  var isKeywordSearch = url.indexOf('/search/movie') !== -1
  var page = Math.floor(start / config.count) + 1
  var requestUrl = ''
  
  if (isKeywordSearch) {
    // 关键词搜索
    requestUrl = url + '?api_key=' + config.tmdbApiKey + '&language=zh-CN&query=' + encodeURIComponent(keyword) + '&page=' + page
  } else {
    // 类型搜索（使用discover API）
    // 将中文类型名称转换为TMDB类型ID
    var genreId = genreMap.getGenreId(keyword)
    if (genreId) {
      requestUrl = url + '?api_key=' + config.tmdbApiKey + '&language=zh-CN&with_genres=' + genreId + '&page=' + page
    } else {
      // 如果找不到类型ID，使用关键词搜索作为备选
      console.warn('未找到类型ID，使用关键词搜索:', keyword)
      requestUrl = config.apiList.search.byKeyword + '?api_key=' + config.tmdbApiKey + '&language=zh-CN&query=' + encodeURIComponent(keyword) + '&page=' + page
    }
  }
  
  console.log('搜索请求URL:', requestUrl)
  
  if (that.data.hasMore) {
    wx.request({
      url: requestUrl,
      method: 'GET',
      header: {
        "Content-Type": "application/json"
      },
      timeout: 30000,  // 设置30秒超时
      success: function(res){
        console.log('TMDB搜索响应:', res)
        if (res.statusCode === 200 && res.data && res.data.results) {
          // 转换TMDB数据格式为豆瓣格式
          var convertedData = tmdbAdapter.convertFilmListResponse(res.data)
          
          if(convertedData.subjects.length === 0){
            that.setData({
              hasMore: false,
              showLoading: false
            })
          }else{
            // 确保 films 是一个数组，防止 undefined.concat 错误
            var currentFilms = that.data.films || []
            that.setData({
              films: currentFilms.concat(convertedData.subjects),
              start: (that.data.start || 0) + convertedData.subjects.length,
              showLoading: false
            })
            // 检查是否还有更多数据
            if (res.data.page >= res.data.total_pages) {
              that.setData({
                hasMore: false
              })
            }
            wx.setNavigationBarTitle({
                title: keyword
            })
          }
          wx.stopPullDownRefresh()
          typeof cb == 'function' && cb(convertedData)
        } else {
          console.error('搜索数据格式错误:', res.data)
          that.setData({
            hasMore: false,
            showLoading: false
          })
          message.show.call(that,{
            content: '搜索失败，请检查API配置',
            icon: 'offline',
            duration: 3000
          })
          wx.stopPullDownRefresh()
        }
      },
      fail: function(err) {
        console.error('搜索请求失败:', err)
        console.error('请求URL:', requestUrl)
        
        var errorMsg = '网络请求失败'
        if (err.errMsg) {
          if (err.errMsg.indexOf('域名') !== -1 || err.errMsg.indexOf('not in domain list') !== -1) {
            errorMsg = '请在小程序后台配置合法域名：api.themoviedb.org'
          } else if (err.errMsg.indexOf('timeout') !== -1) {
            errorMsg = '请求超时，请检查网络'
          } else {
            errorMsg = '请求失败：' + err.errMsg
          }
        }
        
        that.setData({
            showLoading: false
        })
        message.show.call(that,{
          content: errorMsg,
          icon: 'offline',
          duration: 4000
        })
        wx.stopPullDownRefresh()
      }
    })
  }
}
// 获取电影评论
function fetchFilmReviews(url, id, page, cb) {
  var that = this;
  message.hide.call(that)
  // TMDB评论API: /movie/{id}/reviews
  var requestUrl = url + id + '/reviews?api_key=' + config.tmdbApiKey + '&language=zh-CN&page=' + (page || 1)
  console.log('请求电影评论URL:', requestUrl)
  
  wx.request({
    url: requestUrl,
    method: 'GET',
    header: {
      "Content-Type": "application/json"
    },
    timeout: 30000,
    success: function(res){
      console.log('TMDB电影评论响应:', res)
      if (res.statusCode === 200 && res.data) {
        // 转换TMDB评论数据格式
        var convertedData = tmdbAdapter.convertReviewListResponse(res.data)
        typeof cb == 'function' && cb(convertedData)
      } else {
        console.error('电影评论数据格式错误:', res.data)
        message.show.call(that,{
          content: '获取评论失败',
          icon: 'offline',
          duration: 3000
        })
      }
    },
    fail: function(err) {
      console.error('请求电影评论失败:', err)
      var errorMsg = '网络请求失败'
      if (err.errMsg) {
        if (err.errMsg.indexOf('域名') !== -1 || err.errMsg.indexOf('not in domain list') !== -1) {
          errorMsg = '请在小程序后台配置合法域名：api.themoviedb.org'
        } else if (err.errMsg.indexOf('timeout') !== -1) {
          errorMsg = '请求超时，请检查网络'
        } else {
          errorMsg = '请求失败：' + err.errMsg
        }
      }
      message.show.call(that,{
        content: errorMsg,
        icon: 'offline',
        duration: 4000
      })
    }
  })
}

// 获取电影讨论（使用Reddit API）
function fetchFilmDiscussions(url, filmId, page, cb) {
  var that = this;
  message.hide.call(that)
  
  // 首先获取电影详情以获取电影标题（中文和英文）
  // 如果filmId是数字，说明是TMDB ID，需要先获取电影信息
  // 如果filmId是对象，说明已经传入了电影信息
  var filmTitle = null
  var filmOriginalTitle = null
  var filmInfo = null
  
  if (typeof filmId === 'object' && filmId.title) {
    // 如果传入的是电影对象，直接使用
    filmInfo = filmId
    filmTitle = filmId.title
    filmOriginalTitle = filmId.original_title || null
  } else if (that.data.filmDetail && that.data.filmDetail.title) {
    // 从页面数据获取电影标题
    filmTitle = that.data.filmDetail.title
    filmOriginalTitle = that.data.filmDetail.original_title || null
  }
  
  // 如果没有电影标题，尝试通过TMDB API获取
  if (!filmTitle && (typeof filmId === 'string' || typeof filmId === 'number')) {
    // 先获取电影详情
    var tmdbUrl = config.apiList.filmDetail || 'https://api.themoviedb.org/3/movie/'
    fetchFilmDetail.call(that, tmdbUrl, filmId, function(data) {
      if (data && data.title) {
        fetchRedditDiscussions.call(that, data.title, data.original_title || null, page, cb)
      } else {
        typeof cb == 'function' && cb({
          discussions: [],
          total: 0,
          page: 1,
          total_pages: 1
        })
      }
    })
    return
  }
  
  // 如果有电影标题，直接搜索Reddit（同时使用中文和英文标题）
  if (filmTitle) {
    fetchRedditDiscussions.call(that, filmTitle, filmOriginalTitle, page, cb)
  } else {
    typeof cb == 'function' && cb({
      discussions: [],
      total: 0,
      page: 1,
      total_pages: 1
    })
  }
}

// 从Reddit获取电影讨论（多级搜索策略，同时搜索英文和中文讨论）
function fetchRedditDiscussions(filmTitle, filmOriginalTitle, page, cb) {
  var that = this
  console.log('开始获取Reddit讨论，中文标题:', filmTitle, '英文标题:', filmOriginalTitle)
  
  // 收集所有搜索结果
  var allDiscussions = []
  var completedSearches = 0
  var totalSearches = 0
  
  // 构建搜索策略列表（同时搜索英文和中文）
  var searchStrategies = []
  
  // 如果有英文标题，优先搜索英文讨论
  if (filmOriginalTitle && filmOriginalTitle !== filmTitle) {
    // 英文标题搜索策略
    searchStrategies.push(
      // 策略1: 英文标题搜索r/movies（英文电影讨论主版块）
      {
        query: filmOriginalTitle,
        subreddit: 'movies',
        sort: 'hot',
        time: 'year',
        limit: 15
      },
      // 策略2: 英文标题搜索r/movies，按相关性
      {
        query: filmOriginalTitle,
        subreddit: 'movies',
        sort: 'relevance',
        time: 'all',
        limit: 15
      },
      // 策略3: 英文关键词搜索（去掉副标题）
      {
        query: filmOriginalTitle.split(':')[0].split(' - ')[0].trim(),
        subreddit: 'movies',
        sort: 'hot',
        time: 'year',
        limit: 15
      }
    )
  }
  
  // 中文标题搜索策略（搜索中文讨论版块）
  searchStrategies.push(
    // 策略4: 中文标题搜索r/movies（可能有一些中文讨论）
    {
      query: filmTitle,
      subreddit: 'movies',
      sort: 'hot',
      time: 'year',
      limit: 10
    },
    // 策略5: 中文标题搜索整个Reddit（可能找到中文子版块）
    {
      query: filmTitle,
      subreddit: null,
      sort: 'hot',
      time: 'year',
      limit: 15
    },
    // 策略6: 中文关键词搜索（去掉冒号、副标题）
    {
      query: filmTitle.split(':')[0].split('：')[0].split(' - ')[0].trim(),
      subreddit: null,
      sort: 'hot',
      time: 'year',
      limit: 10
    }
  )
  
  totalSearches = searchStrategies.length
  
  // 如果没有任何搜索策略，直接返回空结果
  if (totalSearches === 0) {
    typeof cb == 'function' && cb({
      discussions: [],
      total: 0,
      page: 1,
      total_pages: 1
    })
    return
  }
  
  // 执行所有搜索策略（并行）
  searchStrategies.forEach(function(strategy, index) {
    var searchQuery = encodeURIComponent(strategy.query)
    var requestUrl
    
    if (strategy.subreddit) {
      // 限制在特定子版块
      requestUrl = 'https://www.reddit.com/r/' + strategy.subreddit + '/search.json?q=' + searchQuery + '&restrict_sr=1&sort=' + strategy.sort + '&limit=' + strategy.limit + '&t=' + strategy.time
    } else {
      // 搜索整个Reddit
      requestUrl = 'https://www.reddit.com/search.json?q=' + searchQuery + '&sort=' + strategy.sort + '&limit=' + strategy.limit + '&t=' + strategy.time
    }
    
    console.log('执行搜索策略', index + 1, 'URL:', requestUrl)
    
    wx.request({
      url: requestUrl,
      method: 'GET',
      header: {
        "Content-Type": "application/json"
      },
      timeout: 30000,
      success: function(res){
        completedSearches++
        console.log('搜索策略', index + 1, '响应状态码:', res.statusCode)
        
        if (res.statusCode === 200 && res.data && res.data.data && res.data.data.children) {
          var children = res.data.data.children || []
          console.log('策略', index + 1, '返回的讨论数量:', children.length)
          
          if (children.length > 0) {
            // 转换Reddit数据格式
            var convertedData = tmdbAdapter.convertRedditDiscussionResponse(res.data, filmTitle)
            if (convertedData && convertedData.discussions && convertedData.discussions.length > 0) {
              // 合并到总结果中（去重，基于ID）
              convertedData.discussions.forEach(function(discussion) {
                var exists = allDiscussions.some(function(existing) {
                  return existing.id === discussion.id
                })
                if (!exists) {
                  allDiscussions.push(discussion)
                }
              })
            }
          }
        }
        
        // 所有搜索完成后，返回合并结果
        if (completedSearches >= totalSearches) {
          console.log('所有搜索完成，合并后的讨论总数:', allDiscussions.length)
          // 按评分和回复数排序，优先显示热门讨论
          allDiscussions.sort(function(a, b) {
            var scoreA = (a.score || 0) + (a.replies_count || 0) * 2
            var scoreB = (b.score || 0) + (b.replies_count || 0) * 2
            return scoreB - scoreA
          })
          
          typeof cb == 'function' && cb({
            discussions: allDiscussions,
            total: allDiscussions.length,
            page: 1,
            total_pages: 1
          })
        }
      },
      fail: function(err) {
        completedSearches++
        console.error('搜索策略', index + 1, '请求失败:', err)
        
        // 所有搜索完成后，返回合并结果
        if (completedSearches >= totalSearches) {
          console.log('所有搜索完成（部分失败），合并后的讨论总数:', allDiscussions.length)
          // 按评分和回复数排序
          allDiscussions.sort(function(a, b) {
            var scoreA = (a.score || 0) + (a.replies_count || 0) * 2
            var scoreB = (b.score || 0) + (b.replies_count || 0) * 2
            return scoreB - scoreA
          })
          
          typeof cb == 'function' && cb({
            discussions: allDiscussions,
            total: allDiscussions.length,
            page: 1,
            total_pages: 1
          })
        }
      }
    })
  })
}

// 生成模拟讨论数据（当Reddit API不可用时使用）
function generateMockDiscussions(filmTitle) {
  var now = new Date()
  var discussions = [
    {
      id: 'mock_1',
      name: '关于《' + filmTitle + '》的观后感',
      description: '这部电影真的很不错，剧情紧凑，演员演技在线。特别是结尾部分，让人印象深刻。推荐大家去看！',
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      author: '电影爱好者',
      replies_count: 15,
      comment_count: 15,
      score: 42,
      permalink: null  // 模拟数据没有permalink，会使用模拟回复
    },
    {
      id: 'mock_2',
      name: '《' + filmTitle + '》的细节分析',
      description: '看完电影后，我发现了很多有趣的细节。导演在镜头语言上下了很多功夫，每个场景都有其深意。',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      author: '影评人',
      replies_count: 28,
      comment_count: 28,
      score: 67,
      permalink: null
    },
    {
      id: 'mock_3',
      name: '大家觉得《' + filmTitle + '》怎么样？',
      description: '刚看完这部电影，想听听大家的看法。个人觉得整体不错，但有些地方还可以改进。',
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      author: '观影者',
      replies_count: 33,
      comment_count: 33,
      score: 89,
      permalink: null
    },
    {
      id: 'mock_4',
      name: '《' + filmTitle + '》的配乐和画面',
      description: '这部电影的配乐和画面都非常出色，营造了很好的氛围。特别是几个关键场景的音乐，让人印象深刻。',
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      author: '音乐爱好者',
      replies_count: 19,
      comment_count: 19,
      score: 54,
      permalink: null
    },
    {
      id: 'mock_5',
      name: '推荐《' + filmTitle + '》给喜欢这类题材的朋友',
      description: '如果你喜欢这种类型的电影，那么《' + filmTitle + '》绝对值得一看。剧情、演技、制作都很到位。',
      created_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      author: '推荐官',
      replies_count: 12,
      comment_count: 12,
      score: 38,
      permalink: null
    }
  ]
  
  return {
    discussions: discussions,
    total: discussions.length,
    page: 1,
    total_pages: 1,
    after: null
  }
}

// 获取讨论的回复（使用Reddit API）
function fetchDiscussionReplies(permalink, cb) {
  var that = this
  console.log('开始获取讨论回复，permalink:', permalink)
  
  // Reddit评论API格式：https://www.reddit.com/r/{subreddit}/comments/{post_id}.json
  // permalink格式：https://www.reddit.com/r/{subreddit}/comments/{post_id}/title/
  // 或：/r/{subreddit}/comments/{post_id}/title/
  // 需要提取subreddit和post_id
  var subredditMatch = permalink.match(/\/r\/([^\/]+)\//)
  var postIdMatch = permalink.match(/\/comments\/([^\/]+)\//)
  
  if (!postIdMatch || !postIdMatch[1]) {
    console.log('无法从permalink提取post_id')
    typeof cb == 'function' && cb([])
    return
  }
  
  var postId = postIdMatch[1]
  var subreddit = subredditMatch && subredditMatch[1] ? subredditMatch[1] : 'movies' // 默认使用movies
  
  // 构建正确的Reddit评论API URL
  var requestUrl = config.apiList.redditBaseUrl + '/r/' + subreddit + '/comments/' + postId + '.json?limit=10'
  
  console.log('提取的子版块:', subreddit, 'post_id:', postId)
  console.log('请求Reddit回复URL:', requestUrl)
  
  wx.request({
    url: requestUrl,
    method: 'GET',
    header: {
      "Content-Type": "application/json"
    },
    timeout: 30000,
    success: function(res){
      console.log('Reddit回复响应状态码:', res.statusCode)
      console.log('Reddit回复响应数据结构:', res.data ? (res.data.length ? '数组长度: ' + res.data.length : '对象') : '无数据')
      
      if (res.statusCode === 200 && res.data && res.data.length > 1 && res.data[1].data) {
        var commentsData = res.data[1].data.children || []
        console.log('Reddit返回的原始回复数量:', commentsData.length)
        
        var replies = commentsData.map(function(child) {
          var comment = child.data || {}
          return {
            id: comment.id || '',
            author: comment.author || '匿名用户',
            content: comment.body || '',
            created_at: comment.created ? new Date(comment.created * 1000).toISOString() : new Date().toISOString(),
            score: comment.score || 0
          }
        }).filter(function(reply) {
          return reply.content && reply.content.length > 0
        })
        
        console.log('转换后的回复数量:', replies.length)
        if (replies.length > 0) {
          console.log('第一条回复内容:', replies[0].content.substring(0, 50) + '...')
          console.log('回复作者:', replies[0].author)
        }
        typeof cb == 'function' && cb(replies)
      } else {
        console.log('Reddit回复数据格式错误或为空，状态码:', res.statusCode)
        console.log('响应数据:', res.data)
        // 返回空数组，不使用模拟数据
        typeof cb == 'function' && cb([])
      }
    },
    fail: function(err) {
      console.error('请求Reddit回复失败:', err)
      // 返回空数组，不使用模拟数据
      typeof cb == 'function' && cb([])
    }
  })
}

module.exports = {
  fetchFilms: fetchFilms,
  fetchFilmDetail: fetchFilmDetail,
  fetchPersonDetail: fetchPersonDetail,
  search: search,
  fetchFilmReviews: fetchFilmReviews,
  fetchFilmDiscussions: fetchFilmDiscussions,
  fetchDiscussionReplies: fetchDiscussionReplies
}