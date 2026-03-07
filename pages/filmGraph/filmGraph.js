var config = require('../../comm/script/config')
var themeUtil = require('../../util/themeUtil')

Page({
  data: {
    darkMode: false,
    movieId: '',
    movieTitle: '',
    graphLoading: true,
    graphError: '',
    graphData: null,
    relationFilmsLoading: false,
    relationFilmsError: '',
    relationFilms: [],
    selectedNode: null,
    selectedNodeLabel: ''
  },

  onLoad: function(options) {
    var movieId = options && options.movieId ? options.movieId : ''
    var movieTitle = options && options.title ? decodeURIComponent(options.title) : ''
    themeUtil.applyPageTheme(this)
    this.setData({
      movieId: movieId,
      movieTitle: movieTitle
    })
    this.loadGraphData()
  },

  onShow: function() {
    themeUtil.applyPageTheme(this)
  },

  onPullDownRefresh: function() {
    this.loadGraphData()
  },

  getTmdbBaseUrl: function() {
    var filmDetailUrl = config.apiList && config.apiList.filmDetail ? config.apiList.filmDetail : ''
    if (filmDetailUrl && filmDetailUrl.indexOf('/movie/') !== -1) {
      return filmDetailUrl.replace(/\/movie\/$/, '')
    }
    return 'https://api.themoviedb.org/3'
  },

  normalizeMovieItem: function(item) {
    var posterPath = item && item.poster_path ? item.poster_path : ''
    var backdropPath = item && item.backdrop_path ? item.backdrop_path : ''
    var releaseDate = item && item.release_date ? item.release_date : ''
    var year = releaseDate && releaseDate.length >= 4 ? releaseDate.slice(0, 4) : ''
    return {
      id: item && item.id ? item.id : '',
      title: item && (item.title || item.name) ? (item.title || item.name) : '',
      originalTitle: item && item.original_title ? item.original_title : '',
      overview: item && item.overview ? item.overview : '',
      releaseDate: releaseDate,
      year: year,
      voteAverage: item && item.vote_average ? item.vote_average : 0,
      voteCount: item && item.vote_count ? item.vote_count : 0,
      popularity: item && item.popularity ? item.popularity : 0,
      posterUrl: posterPath ? ('https://image.tmdb.org/t/p/w500' + posterPath) : '',
      backdropUrl: backdropPath ? ('https://image.tmdb.org/t/p/w780' + backdropPath) : '',
      source: 'tmdb'
    }
  },

  tmdbRequest: function(path, query, successCb, failCb) {
    var baseUrl = this.getTmdbBaseUrl()
    var params = query || {}
    params.api_key = config.tmdbApiKey
    params.language = 'zh-CN'
    var queryParts = []
    for (var key in params) {
      if (!params.hasOwnProperty(key)) {
        continue
      }
      if (params[key] === undefined || params[key] === null || params[key] === '') {
        continue
      }
      queryParts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
    }
    var url = baseUrl + path + (queryParts.length > 0 ? ('?' + queryParts.join('&')) : '')
    wx.request({
      url: url,
      method: 'GET',
      timeout: 20000,
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          typeof successCb === 'function' && successCb(res.data)
        } else {
          typeof failCb === 'function' && failCb({
            message: 'TMDB接口响应异常',
            statusCode: res.statusCode
          })
        }
      },
      fail: function(err) {
        var msg = 'TMDB请求失败'
        if (err && err.errMsg) {
          if (err.errMsg.indexOf('not in domain list') !== -1 || err.errMsg.indexOf('域名') !== -1) {
            msg = '请在小程序后台配置合法域名：api.themoviedb.org'
          } else if (err.errMsg.indexOf('timeout') !== -1) {
            msg = 'TMDB请求超时，请稍后重试'
          } else {
            msg = 'TMDB请求失败：' + err.errMsg
          }
        }
        typeof failCb === 'function' && failCb({
          message: msg
        })
      }
    })
  },

  loadGraphData: function() {
    var that = this
    var useBackendGraphApi = !!config.useBackendGraphApi
    if (!that.data.movieId) {
      that.setData({
        graphLoading: false,
        graphError: '缺少电影ID，无法加载关系图谱'
      })
      wx.stopPullDownRefresh()
      return
    }

    that.setData({
      graphLoading: true,
      graphError: ''
    })

    // 无后端图谱配置时直接走TMDB兜底
    if (!useBackendGraphApi || !config.apiList || !config.apiList.graph || !config.apiList.graph.relation) {
      that.loadGraphDataFromTmdb()
      return
    }

    wx.request({
      url: config.apiList.graph.relation + '?movieId=' + encodeURIComponent(that.data.movieId),
      method: 'GET',
      timeout: 20000,
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
          var graphData = that.normalizeGraphData(res.data.data)
          that.setData({
            graphLoading: false,
            graphData: graphData,
            graphError: '',
            relationFilms: [],
            relationFilmsError: '',
            selectedNode: null,
            selectedNodeLabel: ''
          })
        } else if (res.statusCode === 404) {
          // 后端尚未更新图谱接口时自动降级到TMDB直连
          that.loadGraphDataFromTmdb()
        } else {
          that.setData({
            graphLoading: false,
            graphError: (res.data && res.data.message) ? res.data.message : '关系图谱加载失败'
          })
        }
      },
      fail: function(err) {
        // 后端不可达时降级到TMDB
        that.loadGraphDataFromTmdb()
      },
      complete: function() {
        wx.stopPullDownRefresh()
      }
    })
  },

  loadGraphDataFromTmdb: function() {
    var that = this
    that.tmdbRequest('/movie/' + encodeURIComponent(that.data.movieId), {
      append_to_response: 'credits',
      region: 'CN'
    }, function(movieDetail) {
      var credits = movieDetail && movieDetail.credits ? movieDetail.credits : {}
      var crew = credits && Array.isArray(credits.crew) ? credits.crew : []
      var cast = credits && Array.isArray(credits.cast) ? credits.cast : []
      var genres = movieDetail && Array.isArray(movieDetail.genres) ? movieDetail.genres : []
      var collection = movieDetail && movieDetail.belongs_to_collection ? movieDetail.belongs_to_collection : null

      var directors = []
      var directorMap = {}
      for (var i = 0; i < crew.length; i++) {
        var person = crew[i]
        if (!person || person.job !== 'Director') {
          continue
        }
        if (directorMap[person.id]) {
          continue
        }
        directorMap[person.id] = true
        directors.push({
          id: person.id,
          name: person.name || '',
          type: 'director',
          role: '导演'
        })
      }

      var actors = []
      var maxActor = Math.min(cast.length, 12)
      for (var j = 0; j < maxActor; j++) {
        var actor = cast[j]
        if (!actor || !actor.id) {
          continue
        }
        actors.push({
          id: actor.id,
          name: actor.name || '',
          type: 'actor',
          role: '演员',
          character: actor.character || ''
        })
      }

      var genreNodes = []
      for (var g = 0; g < genres.length; g++) {
        genreNodes.push({
          id: genres[g].id,
          name: genres[g].name || '',
          type: 'genre',
          role: '类型'
        })
      }

      var series = []
      if (collection && collection.id) {
        series.push({
          id: collection.id,
          name: collection.name || '',
          type: 'series',
          role: '系列电影'
        })
      }

      var graphData = {
        movie: that.normalizeMovieItem(movieDetail),
        relations: {
          directors: directors,
          actors: actors,
          genres: genreNodes,
          series: series
        },
        sample: {
          name: '诺兰',
          relationType: '导演',
          films: [
            { id: 157336, title: '星际穿越' },
            { id: 27205, title: '盗梦空间' },
            { id: 872585, title: '奥本海默' }
          ]
        }
      }
      graphData.movie.overview = movieDetail && movieDetail.overview ? movieDetail.overview : ''

      that.setData({
        graphLoading: false,
        graphData: graphData,
        graphError: '',
        relationFilms: [],
        relationFilmsError: '',
        selectedNode: null,
        selectedNodeLabel: ''
      })
    }, function(err) {
      that.setData({
        graphLoading: false,
        graphError: err && err.message ? err.message : '关系图谱加载失败'
      })
    })
  },

  normalizeGraphData: function(raw) {
    var data = raw || {}
    var movie = data.movie || {}
    var relations = data.relations || {}
    return {
      movie: movie,
      relations: {
        directors: Array.isArray(relations.directors) ? relations.directors : [],
        actors: Array.isArray(relations.actors) ? relations.actors : [],
        genres: Array.isArray(relations.genres) ? relations.genres : [],
        series: Array.isArray(relations.series) ? relations.series : []
      },
      sample: data.sample || null
    }
  },

  retryGraph: function() {
    this.loadGraphData()
  },

  onTapRelationNode: function(e) {
    var node = e.currentTarget.dataset || {}
    if (!node.id || !node.type) {
      return
    }
    this.setData({
      selectedNode: node,
      selectedNodeLabel: node.name || '关联节点'
    })
    this.loadRelationFilms(node)
  },

  loadRelationFilms: function(node) {
    var that = this
    var requestUrl = ''
    var relationType = node.type
    var relationId = node.id
    var hasGraphApi = !!(
      config.useBackendGraphApi &&
      config.apiList &&
      config.apiList.graph &&
      config.apiList.graph.personFilms &&
      config.apiList.graph.genreFilms &&
      config.apiList.graph.seriesFilms
    )

    if (!hasGraphApi) {
      that.setData({
        relationFilmsLoading: true,
        relationFilmsError: ''
      })
      that.loadRelationFilmsFromTmdb(node)
      return
    }

    if (relationType === 'actor') {
      requestUrl = config.apiList.graph.personFilms + encodeURIComponent(relationId) + '/films?role=actor&limit=80'
    } else if (relationType === 'director') {
      requestUrl = config.apiList.graph.personFilms + encodeURIComponent(relationId) + '/films?role=director&limit=80'
    } else if (relationType === 'genre') {
      requestUrl = config.apiList.graph.genreFilms + encodeURIComponent(relationId) + '/films?page=1&limit=80'
    } else if (relationType === 'series') {
      requestUrl = config.apiList.graph.seriesFilms + encodeURIComponent(relationId) + '/films'
    } else {
      that.setData({
        relationFilmsError: '暂不支持该关系类型'
      })
      return
    }

    that.setData({
      relationFilmsLoading: true,
      relationFilmsError: ''
    })

    wx.request({
      url: requestUrl,
      method: 'GET',
      timeout: 20000,
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
          var list = res.data.data.films
          that.setData({
            relationFilmsLoading: false,
            relationFilms: Array.isArray(list) ? list : [],
            relationFilmsError: ''
          })
        } else if (res.statusCode === 404) {
          that.loadRelationFilmsFromTmdb(node)
        } else {
          that.setData({
            relationFilmsLoading: false,
            relationFilmsError: (res.data && res.data.message) ? res.data.message : '加载关联电影失败'
          })
        }
      },
      fail: function(err) {
        that.loadRelationFilmsFromTmdb(node)
      }
    })
  },

  loadRelationFilmsFromTmdb: function(node) {
    var that = this
    var relationType = node.type
    var relationId = node.id

    if (relationType === 'actor' || relationType === 'director') {
      that.tmdbRequest('/person/' + encodeURIComponent(relationId) + '/movie_credits', {}, function(data) {
        var cast = data && Array.isArray(data.cast) ? data.cast : []
        var crew = data && Array.isArray(data.crew) ? data.crew : []
        var sourceList = []
        if (relationType === 'actor') {
          sourceList = cast
        } else {
          for (var i = 0; i < crew.length; i++) {
            if (crew[i] && crew[i].job === 'Director') {
              sourceList.push(crew[i])
            }
          }
        }
        var mapped = []
        var idMap = {}
        for (var j = 0; j < sourceList.length; j++) {
          var item = sourceList[j]
          if (!item || !item.id || idMap[item.id]) {
            continue
          }
          idMap[item.id] = true
          mapped.push(that.normalizeMovieItem(item))
        }
        mapped.sort(function(a, b) {
          return (b.popularity || 0) - (a.popularity || 0)
        })
        that.setData({
          relationFilmsLoading: false,
          relationFilms: mapped,
          relationFilmsError: ''
        })
      }, function(err) {
        that.setData({
          relationFilmsLoading: false,
          relationFilmsError: err && err.message ? err.message : '加载关联电影失败'
        })
      })
      return
    }

    if (relationType === 'genre') {
      that.tmdbRequest('/discover/movie', {
        with_genres: relationId,
        sort_by: 'popularity.desc',
        include_adult: 'false',
        include_video: 'false',
        page: '1',
        region: 'CN'
      }, function(data) {
        var list = data && Array.isArray(data.results) ? data.results : []
        var mapped = []
        for (var i = 0; i < list.length; i++) {
          mapped.push(that.normalizeMovieItem(list[i]))
        }
        that.setData({
          relationFilmsLoading: false,
          relationFilms: mapped,
          relationFilmsError: ''
        })
      }, function(err) {
        that.setData({
          relationFilmsLoading: false,
          relationFilmsError: err && err.message ? err.message : '加载关联电影失败'
        })
      })
      return
    }

    if (relationType === 'series') {
      that.tmdbRequest('/collection/' + encodeURIComponent(relationId), {}, function(data) {
        var parts = data && Array.isArray(data.parts) ? data.parts : []
        var mapped = []
        for (var i = 0; i < parts.length; i++) {
          mapped.push(that.normalizeMovieItem(parts[i]))
        }
        mapped.sort(function(a, b) {
          var da = a.releaseDate || ''
          var db = b.releaseDate || ''
          if (da < db) return -1
          if (da > db) return 1
          return 0
        })
        that.setData({
          relationFilmsLoading: false,
          relationFilms: mapped,
          relationFilmsError: ''
        })
      }, function(err) {
        that.setData({
          relationFilmsLoading: false,
          relationFilmsError: err && err.message ? err.message : '加载关联电影失败'
        })
      })
      return
    }

    that.setData({
      relationFilmsLoading: false,
      relationFilmsError: '暂不支持该关系类型'
    })
  },

  retryRelationFilms: function() {
    if (this.data.selectedNode) {
      this.loadRelationFilms(this.data.selectedNode)
    }
  },

  viewFilmDetail: function(e) {
    var filmId = e.currentTarget.dataset.id
    if (!filmId) {
      return
    }
    wx.navigateTo({
      url: '../filmDetail/filmDetail?id=' + filmId
    })
  },

  viewSampleFilmDetail: function(e) {
    var filmId = e.currentTarget.dataset.id
    if (!filmId) {
      return
    }
    wx.navigateTo({
      url: '../filmDetail/filmDetail?id=' + filmId
    })
  }
})
