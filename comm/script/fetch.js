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
            that.setData({
              films: that.data.films.concat(convertedData.subjects),
              start: that.data.start + convertedData.subjects.length,
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
            that.setData({
              films: that.data.films.concat(convertedData.subjects),
              start: that.data.start + convertedData.subjects.length,
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
module.exports = {
  fetchFilms: fetchFilms,
  fetchFilmDetail: fetchFilmDetail,
  fetchPersonDetail: fetchPersonDetail,
  search: search
}